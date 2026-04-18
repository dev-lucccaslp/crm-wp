import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export default function ChatPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatService.listConversations,
  });

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

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <aside className="w-80 overflow-y-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="border-b border-neutral-200 p-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
          Conversas
        </div>
        {conversations.length === 0 && (
          <div className="p-4 text-sm text-neutral-500">Nenhuma conversa ainda.</div>
        )}
        <ul>
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  setSelectedId(c.id);
                  if (c.unreadCount > 0) {
                    chatService.markRead(c.id).then(() =>
                      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
                    );
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-neutral-100 px-3 py-3 text-left transition hover:bg-neutral-50 dark:border-neutral-800/50 dark:hover:bg-neutral-900',
                  selectedId === c.id && 'bg-neutral-100 dark:bg-neutral-800',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold dark:bg-neutral-700">
                  {(c.contact.name ?? c.contact.phone).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">
                      {c.contact.name ?? c.contact.phone}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {formatTime(c.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-neutral-500">
                      {c.lastMessageText ?? '—'}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-1 flex-col rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        {selected ? (
          <Thread key={selected.id} conversation={selected} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
            Selecione uma conversa
          </div>
        )}
      </section>
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
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div>
          <div className="text-sm font-semibold">{contactLabel}</div>
          <div className="text-xs text-neutral-500">
            {conversation.contact.phone} · via {conversation.instance.name}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {messages.length === 0 && (
          <div className="text-center text-xs text-neutral-500">
            Sem mensagens ainda.
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          sendMut.mutate(v);
          setText('');
        }}
        className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem"
          className="flex-1 h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={sendMut.isPending || !text.trim()}
          className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          Enviar
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
          'max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm',
          mine
            ? 'bg-emerald-600 text-white'
            : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100',
        )}
      >
        {msg.mediaType !== 'TEXT' && (
          <div className="mb-1 text-[10px] uppercase opacity-70">{msg.mediaType}</div>
        )}
        <div className="whitespace-pre-wrap break-words">
          {msg.content ?? <em className="opacity-70">[mídia]</em>}
        </div>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
          {formatTime(msg.createdAt)}
          {mine && <span>· {msg.status}</span>}
        </div>
      </div>
    </div>
  );
}
