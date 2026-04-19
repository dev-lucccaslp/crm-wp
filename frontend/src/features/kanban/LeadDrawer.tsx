import { useQuery } from '@tanstack/react-query';
import { ArrowRight, X, Clock } from 'lucide-react';
import { kanbanService } from '../../services/kanban';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';

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
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-default bg-surface shadow-elevated animate-slide-up">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-default bg-surface/95 backdrop-blur px-5 py-3">
          <h2 className="text-sm font-semibold text-fg">Detalhes do lead</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {isLoading || !data ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold tracking-tight text-fg">
                {data.title}
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {data.contact && (
                  <Field label="Contato">
                    {data.contact.name ?? data.contact.phone}
                  </Field>
                )}
                {data.value != null && (
                  <Field label="Valor">
                    <span className="font-medium text-success tabular-nums">
                      R$ {Number(data.value).toLocaleString('pt-BR')}
                    </span>
                  </Field>
                )}
                {data.assignee && (
                  <Field label="Responsável">{data.assignee.name}</Field>
                )}
              </div>

              {data.tags.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.tags.map((t) => (
                      <Badge key={t} variant="accent">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {data.notes && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                    Notas
                  </p>
                  <div className="rounded-lg border border-default bg-bg-subtle p-3 text-sm leading-relaxed text-fg">
                    {data.notes}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  <Clock className="h-3 w-3" />
                  Histórico
                </div>
                <ul className="space-y-2">
                  {data.movements.length === 0 && (
                    <li className="text-sm text-fg-muted">
                      Nenhum movimento ainda
                    </li>
                  )}
                  {data.movements.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-lg border border-default bg-bg-subtle p-3 text-xs"
                    >
                      <div className="flex items-center gap-1.5 text-fg">
                        <span className="font-medium">
                          {m.fromColumn?.name ?? 'Início'}
                        </span>
                        <ArrowRight className="h-3 w-3 text-fg-subtle" />
                        <span className="font-medium">{m.toColumn.name}</span>
                      </div>
                      <div className="mt-1 text-fg-subtle">
                        por {m.movedBy?.name ?? 'sistema'} ·{' '}
                        {new Date(m.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p className="text-sm text-fg">{children}</p>
    </div>
  );
}
