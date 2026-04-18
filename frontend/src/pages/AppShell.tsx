import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Kanban,
  MessageSquare,
  Smartphone,
  Zap,
  Sun,
  Moon,
  LogOut,
  Users,
  BarChart2,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { useAuthStore } from '../store/auth-store';
import { authService } from '../services/auth';
import { useTheme } from '../hooks/useTheme';

const NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/app/chat', label: 'Chat', icon: MessageSquare },
  { to: '/app/kanban', label: 'Kanban', icon: Kanban },
  { to: '/app/whatsapp', label: 'WhatsApp', icon: Smartphone },
  { to: '/app/automations', label: 'Automações', icon: Zap },
  { to: '/app/contacts', label: 'Contatos', icon: Users },
  { to: '/app/reports', label: 'Relatórios', icon: BarChart2 },
  { to: '/app/settings', label: 'Configurações', icon: Settings },
] as { to: string; label: string; icon: typeof LayoutGrid; end?: boolean }[];

export default function AppShell() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
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
      try { await authService.logout(refreshToken); } catch { /* ignore */ }
    }
    reset();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 dark:bg-[#111b21]">
      {/* ─── Sidebar icon-only ─── */}
      <aside className="relative flex w-14 shrink-0 flex-col items-center bg-[#202c33] py-2 dark:bg-[#111b21]">
        {/* Logo */}
        <div className="mb-4 mt-1 flex h-10 w-10 select-none items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
          C
        </div>

        {/* Workspace selector */}
        <div className="mb-2 flex w-full justify-center">
          <select
            value={current.id}
            onChange={(e) => setCurrentWorkspace(e.target.value)}
            title={current.name}
            className="w-10 cursor-pointer appearance-none rounded-lg bg-white/5 py-1 text-center text-[10px] text-white/40 focus:outline-none hover:bg-white/10"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id} className="bg-neutral-900 text-white">
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2 w-8 border-b border-white/10" />

        {/* Nav icons */}
        <nav className="flex flex-1 flex-col items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-white/40 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon size={18} strokeWidth={1.75} />
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-1 pb-1">
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={handleLogout}
            title="Sair"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/10 hover:text-red-400"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <main className="flex flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
