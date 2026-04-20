import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Trash2, Send } from 'lucide-react';
import {
  chatService,
  type Conversation,
  type Message,
} from '../services/chat';
import { whatsappService } from '../services/whatsapp';
import { getSocket } from '../services/socket';
import { cn } from '../lib/cn';

const WS_EVENTS = {
  CONVERSATION_UPSERT: 'conversation.upsert',
  MESSAGE_NEW: 'message.new',
  MESSAGE_STATUS: 'message.status',
};

function formatTime(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Avatar inicial
function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={cn(
        'shrink-0 rounded-full flex items-center justify-center text-white font-semibold select-none',
        color,
        `h-${size} w-${size}`,
      )}
      style={{ fontSize: size * 1.3 }}
    >
      {initials}
    </div>
  );
}

export default function ChatPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: conversations = [] } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatService.listConversations,
  });

  // primeira instância conectada para exibir no header do painel
  const { data: instances = [] } = useQuery({
    queryKey: ['whatsapp', 'instances'],
    queryFn: whatsappService.list,
  });
  const connectedInstance = instances.find((i) => i.status === 'CONNECTED') ?? instances[0];

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onUpsert = (conv: Conversation) => {
      qc.setQueryData<Conversation[]>(['chat', 'conversations'], (prev = []) => {
        const others = prev.filter((c) => c.id !== conv.id);
        return [conv, ...others];
      });
    };
    const onNew = (msg: Message) => {
      qc.setQueryData<Message[]>(
        ['chat', 'messages', msg.conversationId],
        (prev = []) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        },
      );
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    };
    const onStatus = (msg: Message) => {
      qc.setQueryData<Message[]>(
        ['chat', 'messages', msg.conversationId],
        (prev = []) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
      );
    };

    s.on(WS_EVENTS.CONVERSATION_UPSERT, onUpsert);
    s.on(WS_EVENTS.MESSAGE_NEW, onNew);
    s.on(WS_EVENTS.MESSAGE_STATUS, onStatus);
    return () => {
      s.off(WS_EVENTS.CONVERSATION_UPSERT, onUpsert);
      s.off(WS_EVENTS.MESSAGE_NEW, onNew);
      s.off(WS_EVENTS.MESSAGE_STATUS, onStatus);
    };
  }, [qc]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const filtered = useMemo(
    () =>
      search.trim()
        ? conversations.filter((c) => {
            const q = search.toLowerCase();
            return (
              c.contact.name?.toLowerCase().includes(q) ||
              c.contact.phone.includes(q)
            );
          })
        : conversations,
    [conversations, search],
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Left panel ── */}
      <div className="flex w-[340px] shrink-0 flex-col border-r border-default bg-surface">

        {/* Instance header */}
        {connectedInstance && (
          <div className="flex items-center justify-between border-b border-default px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={connectedInstance.name} size={9} />
              <div>
                <div className="text-sm font-semibold text-fg">
                  {connectedInstance.name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      connectedInstance.status === 'CONNECTED' ? 'bg-success' : 'bg-fg-subtle',
                    )}
                  />
                  {connectedInstance.status === 'CONNECTED' ? 'CONECTADO' : connectedInstance.status}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })}
                className="rounded-lg p-2 text-fg-muted transition hover:bg-surface-hover hover:text-fg"
                title="Atualizar"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-bg-subtle px-3 py-2">
            <Search size={14} className="shrink-0 text-fg-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar conversa..."
              className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-fg-subtle">
              Nenhuma conversa ainda.
            </div>
          )}
          {filtered.map((c) => {
            const label = c.contact.name ?? c.contact.phone;
            const isSelected = selectedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  if (c.unreadCount > 0) {
                    chatService.markRead(c.id).then(() =>
                      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
                    );
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-default px-4 py-3 text-left transition',
                  isSelected ? 'bg-surface-hover' : 'hover:bg-surface-hover',
                )}
              >
                <Avatar name={label} size={10} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-fg">{label}</span>
                    <span className="ml-2 shrink-0 text-[11px] text-fg-subtle">
                      {formatTime(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-fg-muted">
                      {c.lastMessageText ?? '—'}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: thread ── */}
      <div className="flex flex-1 flex-col bg-bg">
        {selected ? (
          <Thread key={selected.id} conversation={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-5xl opacity-20">💬</div>
              <p className="text-sm text-fg-muted">Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Thread({ conversation }: { conversation: Conversation }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', 'messages', conversation.id],
    queryFn: () => chatService.listMessages(conversation.id),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  const sendMut = useMutation({
    mutationFn: (t: string) => whatsappService.sendText(conversation.id, t),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['chat', 'messages', conversation.id] }),
  });

  const contactLabel = conversation.contact.name ?? conversation.contact.phone;

  return (
    <>
      {/* Thread header */}
      <header className="flex items-center justify-between border-b border-default bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={contactLabel} size={9} />
          <div>
            <div className="text-sm font-semibold text-fg">{contactLabel}</div>
            <div className="text-xs text-fg-muted">{conversation.contact.phone}</div>
          </div>
        </div>
        <button
          title="Apagar conversa"
          className="rounded-lg p-2 text-fg-muted transition hover:bg-surface-hover hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </header>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto bg-bg-subtle px-8 py-4"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {messages.length === 0 && (
          <div className="text-center text-xs text-fg-subtle pt-8">
            Sem mensagens ainda.
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          sendMut.mutate(v);
          setText('');
        }}
        className="flex items-center gap-2 border-t border-default bg-surface px-4 py-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite uma mensagem"
          className="flex-1 rounded-lg bg-bg px-4 py-2.5 text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-1 focus:ring-[hsl(var(--accent)/0.5)] border border-default"
        />
        <button
          type="submit"
          disabled={sendMut.isPending || !text.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const mine = msg.direction === 'OUTBOUND';
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'relative max-w-[65%] rounded-lg px-3 py-2 text-sm shadow-card',
          mine
            ? 'rounded-tr-none bg-accent text-accent-fg'
            : 'rounded-tl-none bg-surface text-fg',
        )}
      >
        {msg.mediaType !== 'TEXT' && (
          <div className="mb-1 text-[10px] uppercase opacity-60">{msg.mediaType}</div>
        )}
        <div className="whitespace-pre-wrap break-words leading-snug">
          {msg.content ?? <em className="opacity-50">[mídia]</em>}
        </div>
        <div className={cn('mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-60')}>
          {formatTime(msg.createdAt)}
          {mine && msg.status === 'READ' && <span>✓✓</span>}
          {mine && msg.status !== 'READ' && <span>✓</span>}
        </div>
      </div>
    </div>
  );
}
