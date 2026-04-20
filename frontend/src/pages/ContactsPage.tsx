import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { kanbanService } from '../services/kanban';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';

/**
 * Stub funcional de Contatos — consolida leads de todos os boards do workspace.
 * Um módulo dedicado de contatos (deduplicação por telefone) está no backlog.
 */
export default function ContactsPage() {
  const {
    data: leads,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contacts', 'all-leads'],
    queryFn: async () => {
      const boards = await kanbanService.listBoards();
      const full = await Promise.all(
        boards.map((b) => kanbanService.getBoard(b.id)),
      );
      return full.flatMap((board) =>
        board.columns.flatMap((c) =>
          c.leads.map((l) => ({
            id: l.id,
            title: l.title,
            phone: l.contact?.phone ?? null,
            contactName: l.contact?.name ?? null,
            column: c.name,
            updatedAt: l.updatedAt,
          })),
        ),
      );
    },
  });

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              Contatos
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              Leads consolidados de todos os boards do workspace.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/kanban">Ir para Kanban</Link>
          </Button>
        </div>

        <div className="mt-6">
          {isLoading && <Skeleton className="h-64" />}
          {error && (
            <ErrorState
              error={error}
              onRetry={() => refetch()}
              title="Não foi possível carregar contatos"
            />
          )}
          {!isLoading && !error && (leads ?? []).length === 0 && (
            <EmptyState
              icon={Users}
              title="Nenhum contato ainda"
              description="Adicione leads ao Kanban para vê-los consolidados aqui."
              action={
                <Button asChild size="sm">
                  <Link to="/app/kanban">Abrir Kanban</Link>
                </Button>
              }
            />
          )}
          {!isLoading && leads && leads.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-default bg-surface">
              <table className="w-full text-sm">
                <thead className="bg-bg text-left text-[11px] uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th className="px-3 py-2">Lead</th>
                    <th className="px-3 py-2">Contato</th>
                    <th className="px-3 py-2">Telefone</th>
                    <th className="px-3 py-2">Coluna</th>
                    <th className="px-3 py-2">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-t border-default">
                      <td className="px-3 py-2 font-medium">{l.title}</td>
                      <td className="px-3 py-2 text-fg-muted">
                        {l.contactName ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-fg-muted">
                        {l.phone ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-fg-muted">{l.column}</td>
                      <td className="px-3 py-2 text-fg-muted">
                        {new Date(l.updatedAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
