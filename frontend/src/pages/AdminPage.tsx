import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { adminService } from '../services/admin';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/cn';

type Tab = 'metrics' | 'workspaces' | 'users' | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'metrics', label: 'Métricas' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'users', label: 'Usuários' },
  { id: 'audit', label: 'Audit logs' },
];

function formatMs(ms: number) {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}min`;
  return `${(m / 60).toFixed(1)}h`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('metrics');

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-default bg-surface px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Super Admin</h1>
        <p className="text-xs text-fg-subtle">
          Visão global da plataforma. Acesso restrito.
        </p>
      </header>

      <div className="shrink-0 border-b border-default bg-surface px-6">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative h-10 px-3 text-sm font-medium transition',
                tab === t.id
                  ? 'text-accent'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'metrics' && <MetricsView />}
        {tab === 'workspaces' && <WorkspacesView />}
        {tab === 'users' && <UsersView />}
        {tab === 'audit' && <AuditView />}
      </div>
    </div>
  );
}

function MetricsView() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: adminService.metrics,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Workspaces', value: data.totals.workspaces },
    { label: 'Usuários', value: data.totals.users },
    { label: 'Leads (total)', value: data.totals.leads },
    { label: 'Mensagens (total)', value: data.totals.messages },
    { label: 'Leads últimos 30d', value: data.leads.last30 },
    { label: 'Leads últimos 7d', value: data.leads.last7 },
    {
      label: 'Mensagens 30d (in/out)',
      value: `${data.messages.inbound30} / ${data.messages.outbound30}`,
    },
    { label: 'Tempo médio resposta', value: formatMs(data.avgResponseMs) },
    {
      label: 'Conversão 30d',
      value: `${(data.conversionRate * 100).toFixed(1)}%`,
    },
    { label: 'Ganhos 30d', value: data.leads.won30 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-default bg-surface p-4"
        >
          <div className="text-[11px] uppercase tracking-wide text-fg-subtle">
            {c.label}
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkspacesView() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'workspaces'],
    queryFn: adminService.workspaces,
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="overflow-hidden rounded-lg border border-default bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-bg text-left text-[11px] uppercase tracking-wide text-fg-subtle">
          <tr>
            <th className="px-3 py-2">Workspace</th>
            <th className="px-3 py-2">Plano</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Membros</th>
            <th className="px-3 py-2 text-right">Instâncias</th>
            <th className="px-3 py-2 text-right">Leads</th>
            <th className="px-3 py-2 text-right">Conversas</th>
            <th className="px-3 py-2">Criado</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((w) => (
            <tr key={w.id} className="border-t border-default">
              <td className="px-3 py-2">
                <div className="font-medium">{w.name}</div>
                <div className="text-[11px] text-fg-subtle">{w.slug}</div>
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline">{w.plan}</Badge>
              </td>
              <td className="px-3 py-2">
                <Badge
                  variant={
                    w.status === 'ACTIVE' || w.status === 'TRIALING'
                      ? 'success'
                      : w.status === 'PAST_DUE'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {w.status}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{w.members}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {w.instances}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{w.leads}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {w.conversations}
              </td>
              <td className="px-3 py-2 text-fg-muted">
                {formatDate(w.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersView() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminService.users,
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="overflow-hidden rounded-lg border border-default bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-bg text-left text-[11px] uppercase tracking-wide text-fg-subtle">
          <tr>
            <th className="px-3 py-2">Usuário</th>
            <th className="px-3 py-2">E-mail</th>
            <th className="px-3 py-2">Workspaces</th>
            <th className="px-3 py-2">Criado</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id} className="border-t border-default">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.name ?? '—'}</span>
                  {u.isSuperAdmin && <Badge variant="accent">admin</Badge>}
                </div>
              </td>
              <td className="px-3 py-2 text-fg-muted">{u.email}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {u.memberships.map((m) => (
                    <Badge
                      key={m.workspace.id}
                      variant="outline"
                      className="text-[10px]"
                    >
                      {m.workspace.name} · {m.role}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2 text-fg-muted">
                {formatDate(u.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditView() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => adminService.auditLogs(200),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="overflow-hidden rounded-lg border border-default bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-bg text-left text-[11px] uppercase tracking-wide text-fg-subtle">
          <tr>
            <th className="px-3 py-2">Quando</th>
            <th className="px-3 py-2">Ação</th>
            <th className="px-3 py-2">Entidade</th>
            <th className="px-3 py-2">Usuário</th>
            <th className="px-3 py-2">Workspace</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((log) => (
            <tr key={log.id} className="border-t border-default">
              <td className="px-3 py-2 text-fg-muted whitespace-nowrap">
                {formatDate(log.createdAt)}
              </td>
              <td className="px-3 py-2">
                <code className="rounded bg-bg px-1.5 py-0.5 text-[11px]">
                  {log.action}
                </code>
              </td>
              <td className="px-3 py-2 text-fg-muted">
                {log.entity ?? '—'}
                {log.entityId && (
                  <span className="text-[10px] text-fg-subtle">
                    {' '}
                    · {log.entityId.slice(0, 8)}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {log.user ? (
                  <div>
                    <div>{log.user.name ?? log.user.email}</div>
                    <div className="text-[11px] text-fg-subtle">
                      {log.user.email}
                    </div>
                  </div>
                ) : (
                  <span className="text-fg-subtle">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-fg-muted">
                {log.workspace?.name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
