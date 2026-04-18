import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wifi, QrCode } from 'lucide-react';
import { whatsappService, type WhatsappInstance } from '../services/whatsapp';
import { getSocket } from '../services/socket';
import { cn } from '../lib/cn';

const WS_EVENTS = {
  WHATSAPP_STATUS: 'whatsapp.status',
  WHATSAPP_QR: 'whatsapp.qr',
};

const STATUS_LABEL: Record<string, string> = {
  CONNECTED: 'CONECTADO',
  CONNECTING: 'CONECTANDO',
  QR: 'AGUARDANDO QR',
  DISCONNECTED: 'DESCONECTADO',
  FAILED: 'FALHA',
};

function statusDot(s: string) {
  if (s === 'CONNECTED') return 'bg-emerald-400';
  if (s === 'CONNECTING' || s === 'QR') return 'bg-amber-400';
  return 'bg-neutral-500';
}

export default function WhatsAppPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['whatsapp', 'instances'],
    queryFn: whatsappService.list,
  });

  const selected = instances.find((i) => i.id === selectedId) ?? instances[0] ?? null;

  const createMut = useMutation({
    mutationFn: (n: string) => whatsappService.create(n),
    onSuccess: (inst) => {
      qc.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
      setName('');
      setSelectedId(inst.id);
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => whatsappService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
      setSelectedId(null);
    },
  });

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onStatus = () => qc.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
    s.on(WS_EVENTS.WHATSAPP_STATUS, onStatus);
    return () => { s.off(WS_EVENTS.WHATSAPP_STATUS, onStatus); };
  }, [qc]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Left: instance list ── */}
      <div className="flex w-[340px] shrink-0 flex-col border-r border-white/[0.06] bg-[#111b21]">
        {/* Header + create form */}
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/30">
            WhatsApp · Instâncias
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(name.trim()); }}
            className="flex gap-2"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da instância..."
              className="flex-1 rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:ring-1 focus:ring-white/10"
            />
            <button
              type="submit"
              disabled={createMut.isPending || !name.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent-hover disabled:opacity-40"
              title="Criar instância"
            >
              <Plus size={16} />
            </button>
          </form>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-6 text-xs text-white/30">Carregando...</div>
          )}
          {!isLoading && instances.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-white/20">
              Nenhuma instância criada.
            </div>
          )}
          {instances.map((inst) => (
            <button
              key={inst.id}
              onClick={() => setSelectedId(inst.id)}
              className={cn(
                'flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition',
                (selected?.id === inst.id) ? 'bg-[#2a3942]' : 'hover:bg-white/[0.04]',
              )}
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/60">
                {inst.name.slice(0, 2).toUpperCase()}
                <span className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111b21]', statusDot(inst.status))} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white/90">{inst.name}</div>
                <div className="text-xs text-white/35">{STATUS_LABEL[inst.status] ?? inst.status}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: detail / QR panel ── */}
      <div className="flex flex-1 flex-col bg-[#0b141a]">
        {selected ? (
          <InstancePanel
            instance={selected}
            onRemove={(id) => removeMut.mutate(id)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-5xl opacity-10">📱</div>
              <p className="text-sm text-white/25">Selecione ou crie uma instância</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InstancePanel({
  instance,
  onRemove,
}: {
  instance: WhatsappInstance;
  onRemove: (id: string) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(instance.status);

  useEffect(() => {
    setStatus(instance.status);
    setQr(null);
  }, [instance.id, instance.status]);

  useEffect(() => {
    if (status === 'CONNECTED') return;
    let alive = true;
    async function tick() {
      try {
        const res = await whatsappService.qr(instance.id);
        if (!alive) return;
        setQr(res.qrBase64);
        setStatus(res.status);
      } catch { /* ignore */ }
    }
    tick();
    const timer = setInterval(tick, 4000);
    const s = getSocket();
    const onQr = (p: { instanceId: string; qrBase64: string }) => {
      if (p.instanceId === instance.id) setQr(p.qrBase64);
    };
    const onStatus = (p: { instanceId: string; status: string }) => {
      if (p.instanceId === instance.id) setStatus(p.status);
    };
    s?.on(WS_EVENTS.WHATSAPP_QR, onQr);
    s?.on(WS_EVENTS.WHATSAPP_STATUS, onStatus);
    return () => {
      alive = false;
      clearInterval(timer);
      s?.off(WS_EVENTS.WHATSAPP_QR, onQr);
      s?.off(WS_EVENTS.WHATSAPP_STATUS, onStatus);
    };
  }, [instance.id, status]);

  const isConnected = status === 'CONNECTED';

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-[#202c33] px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/60">
            {instance.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{instance.name}</div>
            {instance.phoneNumber && (
              <div className="text-xs text-white/40">{instance.phoneNumber}</div>
            )}
          </div>
        </div>
        <button
          onClick={() => { if (confirm(`Remover "${instance.name}"?`)) onRemove(instance.id); }}
          className="rounded-lg p-2 text-white/30 transition hover:bg-white/10 hover:text-red-400"
          title="Remover instância"
        >
          <Trash2 size={15} />
        </button>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        {isConnected ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
              <Wifi size={36} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Conectado</p>
              <p className="mt-0.5 text-sm text-white/40">
                {instance.phoneNumber ?? 'Número vinculado'}
              </p>
            </div>
            <button
              onClick={() => { if (confirm(`Desconectar "${instance.name}"?`)) onRemove(instance.id); }}
              className="rounded-lg border border-red-500/30 px-4 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Desconectar
            </button>
          </div>
        ) : qr ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-white p-4 shadow-lg">
              <img
                src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
                alt="QR Code"
                className="h-56 w-56"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Escaneie com o WhatsApp</p>
              <p className="mt-1 text-xs text-white/30">
                Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <QrCode size={36} className="text-white/20" />
            </div>
            <p className="text-sm text-white/30">Gerando QR Code...</p>
          </div>
        )}
      </div>
    </>
  );
}
