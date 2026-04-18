import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappService, type WhatsappInstance } from '../services/whatsapp';
import { getSocket } from '../services/socket';
import { Button } from '../components/ui/Button';

const WS_EVENTS = {
  WHATSAPP_STATUS: 'whatsapp.status',
  WHATSAPP_QR: 'whatsapp.qr',
};

const statusColor: Record<string, string> = {
  CONNECTED: 'bg-emerald-500',
  CONNECTING: 'bg-amber-500',
  QR: 'bg-sky-500',
  DISCONNECTED: 'bg-neutral-400',
  FAILED: 'bg-rose-500',
};

export default function WhatsAppPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [openQrFor, setOpenQrFor] = useState<string | null>(null);

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['whatsapp', 'instances'],
    queryFn: whatsappService.list,
  });

  const createMut = useMutation({
    mutationFn: (n: string) => whatsappService.create(n),
    onSuccess: (inst) => {
      qc.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
      setName('');
      setOpenQrFor(inst.id);
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => whatsappService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp', 'instances'] }),
  });

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onStatus = () =>
      qc.invalidateQueries({ queryKey: ['whatsapp', 'instances'] });
    s.on(WS_EVENTS.WHATSAPP_STATUS, onStatus);
    return () => {
      s.off(WS_EVENTS.WHATSAPP_STATUS, onStatus);
    };
  }, [qc]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">WhatsApp · Instâncias</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMut.mutate(name.trim());
        }}
        className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da instância (ex.: Atendimento 1)"
          className="flex-1 h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <Button type="submit" loading={createMut.isPending}>
          Criar instância
        </Button>
      </form>

      {isLoading ? (
        <div className="text-sm text-neutral-500">Carregando...</div>
      ) : instances.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Nenhuma instância ainda. Crie a primeira acima.
        </div>
      ) : (
        <ul className="space-y-2">
          {instances.map((inst) => (
            <li
              key={inst.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    statusColor[inst.status] ?? 'bg-neutral-400'
                  }`}
                />
                <div>
                  <div className="text-sm font-medium">{inst.name}</div>
                  <div className="text-xs text-neutral-500">
                    {inst.status}
                    {inst.phoneNumber ? ` · ${inst.phoneNumber}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setOpenQrFor(inst.id)}>
                  {inst.status === 'CONNECTED' ? 'Detalhes' : 'Conectar'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Remover "${inst.name}"?`)) removeMut.mutate(inst.id);
                  }}
                >
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {openQrFor && (
        <QrModal
          instance={instances.find((i) => i.id === openQrFor)}
          onClose={() => setOpenQrFor(null)}
        />
      )}
    </div>
  );
}

function QrModal({
  instance,
  onClose,
}: {
  instance: WhatsappInstance | undefined;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(instance?.status ?? 'CONNECTING');

  useEffect(() => {
    if (!instance) return;
    let alive = true;
    async function tick() {
      try {
        const res = await whatsappService.qr(instance!.id);
        if (!alive) return;
        setQr(res.qrBase64);
        setStatus(res.status);
      } catch {
        /* ignore */
      }
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
  }, [instance]);

  if (!instance) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{instance.name}</h2>
          <span className="text-xs text-neutral-500">{status}</span>
        </div>
        <div className="mt-4 flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
          {status === 'CONNECTED' ? (
            <div className="text-center text-sm text-emerald-600">
              Conectado ✓<br />
              {instance.phoneNumber ?? ''}
            </div>
          ) : qr ? (
            <img
              src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
              alt="QR"
              className="h-64 w-64"
            />
          ) : (
            <div className="text-sm text-neutral-500">Gerando QR...</div>
          )}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e aponte a câmera.
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
