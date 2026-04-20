import { Kanban, MessageSquare, Zap } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';

const CARDS = [
  { title: 'Kanban de Leads', desc: 'Pipeline com drag & drop em tempo real.', icon: Kanban },
  { title: 'Chat WhatsApp', desc: 'Conversas unificadas por workspace.', icon: MessageSquare },
  { title: 'Automações', desc: 'Gatilhos e ações sem código.', icon: Zap },
];

export default function DashboardPage() {
  const { user, workspaces, currentWorkspaceId } = useAuthStore();
  const current = workspaces.find((w) => w.id === currentWorkspaceId);
  const first = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0];

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Bem-vindo, {first}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Workspace ativo <span className="font-medium text-fg">{current?.name}</span>
            {current?.role && (
              <>
                {' · '}
                <span className="rounded-md bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fg-muted">
                  {current.role}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {CARDS.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-default bg-surface p-5 shadow-card transition hover:border-strong hover:shadow-elevated"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--accent)/0.12)] text-accent">
                <c.icon className="h-4 w-4" strokeWidth={2} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-fg">{c.title}</h3>
              <p className="mt-1 text-xs text-fg-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
