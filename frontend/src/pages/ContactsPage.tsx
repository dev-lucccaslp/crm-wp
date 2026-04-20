import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { api } from '../services/api';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  column?: { name: string } | null;
  updatedAt: string;
}

interface Board {
  id: string;
  name: string;
  columns: { id: string; name: string; leads: Lead[] }[];
}

/**
 * Stub funcional de Contatos — consolida leads de todos os boards do workspace.
 * Um módulo dedicado de contatos (deduplicação por telefone) está no backlog.
 */
export default function ContactsPage() {
  const {
    data: boards,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contacts', 'boards'],
    queryFn: () => api.get<Board[]>('/kanban/boards').then((r) => r.data),
  });

  const leads = (boards ?? []).flatMap((b) =>
    b.columns.flatMap((c) =>
      c.leads.map((l) => ({ ...l, column: { name: c.name } })),
    ),
  );

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
          {!isLoading && !error && leads.length === 0 && (
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
          {!isLoading && leads.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-default bg-surface">
              <table className="w-full text-sm">
                <thead className="bg-bg text-left text-[11px] uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Telefone</th>
                    <th className="px-3 py-2">E-mail</th>
                    <th className="px-3 py-2">Coluna</th>
                    <th className="px-3 py-2">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-t border-default">
                      <td className="px-3 py-2 font-medium">
                        {l.name ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-fg-muted">
                        {l.phone ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-fg-muted">
                        {l.email ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-fg-muted">
                        {l.column?.name ?? '—'}
                      </td>
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
