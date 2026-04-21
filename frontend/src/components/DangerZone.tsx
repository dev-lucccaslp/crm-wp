import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { deletionService, type DeletionRequest } from '../services/deletion';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';
import { Input } from './ui/Input';
import { Field } from './ui/Field';
import { useToast } from './ui/Toast';

/** Countdown simples ("em 6d 4h"). */
function formatCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'agora';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  if (d > 0) return `em ${d}d ${h}h`;
  return `em ${h}h`;
}

/**
 * Zona de perigo — pedido de exclusão com 7d de carência. Visível apenas
 * para OWNER. Mostra banner da solicitação pendente com opção de cancelar.
 */
export function DangerZone({ workspaceName }: { workspaceName: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [reason, setReason] = useState('');

  const listQ = useQuery({
    queryKey: ['deletion-requests'],
    queryFn: deletionService.list,
  });
  const pending = useMemo<DeletionRequest | undefined>(
    () => listQ.data?.find((r) => r.status === 'PENDING' && r.type === 'WORKSPACE'),
    [listQ.data],
  );

  const requestMut = useMutation({
    mutationFn: (payload: { reason?: string }) =>
      deletionService.request({ type: 'WORKSPACE', reason: payload.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deletion-requests'] });
      setOpen(false);
      setConfirmName('');
      setReason('');
      toast({
        title: 'Exclusão agendada',
        description: 'Você pode cancelar dentro de 7 dias.',
      });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast({
        title: 'Não foi possível agendar',
        description: err.response?.data?.message ?? 'Tente novamente.',
        variant: 'error',
      });
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => deletionService.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deletion-requests'] });
      toast({ title: 'Exclusão cancelada' });
    },
  });

  return (
    <section className="mt-10 rounded-lg border border-[hsl(var(--danger)/0.35)] bg-[hsl(var(--danger)/0.05)] p-4">
      <header className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-danger" />
        <h2 className="text-sm font-semibold text-danger">Zona de perigo</h2>
      </header>

      {pending ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[hsl(var(--danger)/0.4)] bg-surface p-3">
          <div className="min-w-0 text-xs">
            <div className="font-medium text-fg">
              Exclusão deste workspace agendada
            </div>
            <div className="text-fg-muted">
              Será executada {formatCountdown(pending.scheduledFor)} ·{' '}
              {new Date(pending.scheduledFor).toLocaleString('pt-BR')}
            </div>
            {pending.reason && (
              <div className="mt-0.5 text-fg-subtle">Motivo: {pending.reason}</div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={cancelMut.isPending}
            onClick={() => cancelMut.mutate(pending.id)}
          >
            Cancelar exclusão
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-xs text-fg-muted">
            Exclui permanentemente o workspace <strong>{workspaceName}</strong>{' '}
            após 7 dias. Dentro desse período você pode cancelar a solicitação.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-[hsl(var(--danger)/0.5)] text-danger hover:bg-[hsl(var(--danger)/0.08)]"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir workspace
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir workspace</DialogTitle>
            <DialogDescription>
              Esta ação agenda a exclusão de <strong>{workspaceName}</strong>{' '}
              para daqui a 7 dias. Todos os dados (boards, conversas, contatos,
              automações) serão apagados. Você pode cancelar dentro do prazo.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 flex flex-col gap-3">
            <Field label={`Digite "${workspaceName}" para confirmar`}>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={workspaceName}
                autoFocus
              />
            </Field>
            <Field label="Motivo (opcional)">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex: migração para outra conta"
                maxLength={500}
              />
            </Field>
          </div>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={confirmName !== workspaceName}
              loading={requestMut.isPending}
              onClick={() => requestMut.mutate({ reason: reason || undefined })}
            >
              Agendar exclusão em 7 dias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
