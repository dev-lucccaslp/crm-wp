import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useAuthStore } from '../store/auth-store';
import { authService } from '../services/auth';
import { Button } from '../components/ui/Button';

export default function AppShell() {
  const navigate = useNavigate();
  const {
    user,
    workspaces,
    currentWorkspaceId,
    setCurrentWorkspace,
    refreshToken,
    reset,
  } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (workspaces.length === 0) return <Navigate to="/workspaces/new" replace />;

  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  async function handleLogout() {
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // ignore — local reset is still valid
      }
    }
    reset();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight">CRM - WP</span>
          <nav className="flex items-center gap-1 text-xs">
            {[
              { to: '/app', label: 'Dashboard', end: true },
              { to: '/app/kanban', label: 'Kanban' },
              { to: '/app/chat', label: 'Chat' },
              { to: '/app/whatsapp', label: 'WhatsApp' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-2.5 py-1.5 font-medium transition',
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <select
            value={current.id}
            onChange={(e) => setCurrentWorkspace(e.target.value)}
            className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} · {w.role}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">{user.email}</span>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
