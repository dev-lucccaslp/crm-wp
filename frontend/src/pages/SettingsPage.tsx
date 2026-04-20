import { Link } from 'react-router-dom';
import { CreditCard, User, Building2, Shield, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../store/auth-store';

interface Row {
  icon: typeof User;
  title: string;
  desc: string;
  to?: string;
  badge?: string;
}

/**
 * Página de Configurações — hub navegacional com atalhos para áreas existentes
 * (Plano/Billing, Admin quando super-admin) e placeholders de perfil/workspace.
 */
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const workspaces = useAuthStore((s) => s.workspaces);
  const currentWorkspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const current = workspaces.find((w) => w.id === currentWorkspaceId);

  const rows: Row[] = [
    {
      icon: User,
      title: 'Perfil',
      desc: `${user?.name ?? '—'} · ${user?.email ?? ''}`,
      badge: 'em breve',
    },
    {
      icon: Building2,
      title: 'Workspace',
      desc: `${current?.name ?? '—'} · função ${current?.role ?? '—'}`,
      badge: 'em breve',
    },
    {
      icon: CreditCard,
      title: 'Plano e cobrança',
      desc: 'Gerenciar assinatura, cartão e portal Stripe',
      to: '/app/billing',
    },
  ];
  if (user?.isSuperAdmin) {
    rows.push({
      icon: Shield,
      title: 'Super Admin',
      desc: 'Métricas globais, workspaces, usuários e audit logs',
      to: '/app/admin',
    });
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            Configurações
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Preferências da conta e do workspace.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {rows.map((r) => {
            const body = (
              <div className="flex items-center gap-3 rounded-lg border border-default bg-surface p-4 transition hover:border-strong">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent)/0.12)] text-accent">
                  <r.icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-fg">
                      {r.title}
                    </span>
                    {r.badge && (
                      <span className="rounded-full border border-default px-1.5 py-0.5 text-[10px] text-fg-subtle">
                        {r.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-fg-muted">
                    {r.desc}
                  </div>
                </div>
                {r.to && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                )}
              </div>
            );
            return r.to ? (
              <Link key={r.title} to={r.to} className="block focus:outline-none">
                {body}
              </Link>
            ) : (
              <div key={r.title}>{body}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
