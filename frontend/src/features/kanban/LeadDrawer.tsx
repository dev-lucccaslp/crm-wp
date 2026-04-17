import { useQuery } from '@tanstack/react-query';
import { kanbanService } from '../../services/kanban';
import { Button } from '../../components/ui/Button';

export function LeadDrawer({
  leadId,
  onClose,
}: {
  leadId: string | null;
  onClose: () => void;
}) {
  const enabled = !!leadId;
  const { data, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => kanbanService.getLead(leadId!),
    enabled,
  });

  if (!leadId) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">Detalhes do lead</h2>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="p-5">
          {isLoading || !data ? (
            <p className="text-sm text-neutral-500">Carregando...</p>
          ) : (
            <>
              <h3 className="text-lg font-semibold tracking-tight">{data.title}</h3>
              {data.contact && (
                <p className="mt-1 text-sm text-neutral-500">
                  Contato: {data.contact.name ?? data.contact.phone}
                </p>
              )}
              {data.value && (
                <p className="mt-1 text-sm">
                  Valor:{' '}
                  <span className="font-medium">
                    R$ {Number(data.value).toLocaleString('pt-BR')}
                  </span>
                </p>
              )}
              {data.notes && (
                <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
                  {data.notes}
                </div>
              )}

              <h4 className="mt-6 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Histórico
              </h4>
              <ul className="mt-2 space-y-2">
                {data.movements.length === 0 && (
                  <li className="text-sm text-neutral-500">Nenhum movimento ainda</li>
                )}
                {data.movements.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-md border border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800"
                  >
                    <span className="font-medium">
                      {m.fromColumn?.name ?? '—'} → {m.toColumn.name}
                    </span>
                    <span className="ml-2 text-neutral-500">
                      por {m.movedBy?.name ?? 'sistema'} ·{' '}
                      {new Date(m.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
