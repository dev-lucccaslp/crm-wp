import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wifi, QrCode } from 'lucide-react';
import { whatsappService, type WhatsappInstance } from '../services/whatsapp';
import { getSocket } from '../services/socket';
import { cn } from '../lib/cn';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';

const WS_EVENTS = {
  WHATSAPP_STATUS: 'whatsapp.status',
  WHATSAPP_QR: 'whatsapp.qr',
};

const STATUS_LABEL: Record<string, string> = {
  CONNECTED: 'Conectado',
  CONNECTING: 'Conectando',
  QR: 'Aguardando QR',
  DISCONNECTED: 'Desconectado',
  FAILED: 'Falha',
};

function statusDot(s: string) {
  if (s === 'CONNECTED') return 'bg-success';
  if (s === 'CONNECTING' || s === 'QR') return 'bg-warning';
  return 'bg-fg-subtle';
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
    <div className="flex h-full w-full overflow-hidden bg-bg">
      <div className="flex w-[340px] shrink-0 flex-col border-r border-default bg-surface">
        <div className="border-b border-default px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
            WhatsApp · Instâncias
          </p>
          <form
            onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(name.trim()); }}
            className="flex gap-2"
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da instância..."
            />
            <Button
              type="submit"
              size="icon"
              disabled={createMut.isPending || !name.trim()}
              title="Criar instância"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {!isLoading && instances.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-fg-subtle">
              Nenhuma instância criada.
            </div>
          )}
          {instances.map((inst) => (
            <button
              key={inst.id}
              onClick={() => setSelectedId(inst.id)}
              className={cn(
                'flex w-full items-center gap-3 border-b border-default px-4 py-3 text-left transition',
                selected?.id === inst.id ? 'bg-surface-hover' : 'hover:bg-surface-hover',
              )}
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.15)] text-sm font-bold text-accent">
                {inst.name.slice(0, 2).toUpperCase()}
                <span className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface', statusDot(inst.status))} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-fg">{inst.name}</div>
                <div className="text-xs text-fg-muted">{STATUS_LABEL[inst.status] ?? inst.status}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-bg">
        {selected ? (
          <InstancePanel
            instance={selected}
            onRemove={(id) => removeMut.mutate(id)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover">
                <QrCode className="h-6 w-6 text-fg-subtle" />
              </div>
              <p className="text-sm text-fg-muted">Selecione ou crie uma instância</p>
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
      <header className="flex items-center justify-between border-b border-default bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.15)] text-sm font-bold text-accent">
            {instance.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-fg">{instance.name}</div>
            {instance.phoneNumber && (
              <div className="text-xs text-fg-muted">{instance.phoneNumber}</div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => { if (confirm(`Remover "${instance.name}"?`)) onRemove(instance.id); }}
          title="Remover instância"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        {isConnected ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[hsl(var(--success)/0.12)]">
              <Wifi className="h-8 w-8 text-success" />
            </div>
            <div>
              <p className="text-lg font-semibold text-fg">Conectado</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                {instance.phoneNumber ?? 'Número vinculado'}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => { if (confirm(`Desconectar "${instance.name}"?`)) onRemove(instance.id); }}
            >
              Desconectar
            </Button>
          </div>
        ) : qr ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-white p-4 shadow-elevated">
              <img
                src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
                alt="QR Code"
                className="h-56 w-56"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-fg">Escaneie com o WhatsApp</p>
              <p className="mt-1 text-xs text-fg-muted">
                Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-hover animate-pulse">
              <QrCode className="h-8 w-8 text-fg-subtle" />
            </div>
            <p className="text-sm text-fg-muted">Gerando QR Code...</p>
          </div>
        )}
      </div>
    </>
  );
}
