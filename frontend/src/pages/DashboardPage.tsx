import { useAuthStore } from '../store/auth-store';

export default function DashboardPage() {
  const { user, workspaces, currentWorkspaceId } = useAuthStore();
  const current = workspaces.find((w) => w.id === currentWorkspaceId);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Bem-vindo, {user?.name.split(' ')[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Workspace ativo: <span className="font-medium">{current?.name}</span> · papel{' '}
        <span className="font-mono text-xs">{current?.role}</span>
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { title: 'Kanban de Leads', desc: 'Fase 3 — em breve' },
          { title: 'Chat WhatsApp', desc: 'Fase 4 — em breve' },
          { title: 'Automações', desc: 'Fase 5 — em breve' },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h3 className="text-sm font-semibold">{c.title}</h3>
            <p className="mt-1 text-xs text-neutral-500">{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
