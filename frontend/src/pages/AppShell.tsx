import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Kanban,
  MessageSquare,
  Smartphone,
  Sun,
  Moon,
  LogOut,
  Users,
  BarChart2,
  Settings,
  Zap,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { useAuthStore } from '../store/auth-store';
import { useUiStore } from '../store/ui-store';
import { authService } from '../services/auth';
import { useTheme } from '../hooks/useTheme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/DropdownMenu';
import { QuickTooltip } from '../components/ui/Tooltip';

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  end?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/app/chat', label: 'Chat', icon: MessageSquare },
  { to: '/app/kanban', label: 'Kanban', icon: Kanban },
  { to: '/app/whatsapp', label: 'WhatsApp', icon: Smartphone },
  { to: '/app/automations', label: 'Automações', icon: Zap },
  { to: '/app/contacts', label: 'Contatos', icon: Users },
  { to: '/app/reports', label: 'Relatórios', icon: BarChart2 },
  { to: '/app/billing', label: 'Plano', icon: CreditCard },
  { to: '/app/settings', label: 'Configurações', icon: Settings },
];

export default function AppShell() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
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
        /* ignore */
      }
    }
    reset();
    navigate('/login', { replace: true });
  }

  const collapsed = sidebarCollapsed;
  const userInitial = (user.name ?? user.email).slice(0, 1).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-fg">
      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-default bg-surface transition-[width] duration-200 ease-out',
          collapsed ? 'w-[60px]' : 'w-[240px]',
        )}
      >
        {/* Brand + collapse */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-default',
            collapsed ? 'justify-center px-2' : 'justify-between px-3',
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg shadow-sm">
              C
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight">CRM-WP</span>
            )}
          </div>
          {!collapsed && (
            <QuickTooltip content="Recolher sidebar" side="right">
              <button
                onClick={toggleSidebar}
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </QuickTooltip>
          )}
        </div>

        {/* Workspace switcher */}
        <div className={cn('border-b border-default', collapsed ? 'p-2' : 'p-3')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center rounded-md text-sm transition hover:bg-surface-hover',
                  collapsed ? 'h-10 justify-center' : 'h-10 px-2 gap-2',
                )}
                title={current.name}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent)/0.15)] text-[11px] font-semibold text-accent">
                  {current.name.slice(0, 2).toUpperCase()}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 truncate text-left">
                      <div className="truncate text-sm font-medium">
                        {current.name}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">
                        {current.role}
                      </div>
                    </div>
                    <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side={collapsed ? 'right' : 'bottom'}
              className="w-[220px]"
            >
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {workspaces.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onSelect={() => setCurrentWorkspace(w.id)}
                  className="justify-between"
                >
                  <span className="truncate">{w.name}</span>
                  {w.id === current.id && <Check className="h-3.5 w-3.5 text-accent" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/workspaces/new')}>
                + Novo workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            'flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden',
            collapsed ? 'p-2' : 'p-2',
          )}
        >
          {NAV_ITEMS.map((item) => {
            const content = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center rounded-md text-sm font-medium transition-colors',
                    collapsed ? 'h-10 w-10 justify-center mx-auto' : 'h-9 px-2 gap-3',
                    isActive
                      ? 'bg-[hsl(var(--accent)/0.12)] text-accent'
                      : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
            return collapsed ? (
              <QuickTooltip key={item.to} content={item.label} side="right">
                {content}
              </QuickTooltip>
            ) : (
              content
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            'shrink-0 border-t border-default',
            collapsed ? 'p-2' : 'p-2',
          )}
        >
          {collapsed && (
            <QuickTooltip content="Expandir sidebar" side="right">
              <button
                onClick={toggleSidebar}
                className="mb-1 flex h-10 w-10 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg mx-auto"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </QuickTooltip>
          )}

          {/* Theme */}
          {collapsed ? (
            <QuickTooltip
              content={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              side="right"
            >
              <button
                onClick={toggle}
                className="flex h-10 w-10 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg mx-auto"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
            </QuickTooltip>
          ) : (
            <button
              onClick={toggle}
              className="flex h-9 w-full items-center gap-3 rounded-md px-2 text-sm text-fg-muted transition hover:bg-surface-hover hover:text-fg"
            >
              {theme === 'dark' ? (
                <Sun className="h-[18px] w-[18px]" strokeWidth={1.9} />
              ) : (
                <Moon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              )}
              <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
            </button>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'mt-1 flex w-full items-center rounded-md text-sm transition hover:bg-surface-hover',
                  collapsed ? 'h-10 justify-center' : 'h-11 px-2 gap-2',
                )}
                title={user.email}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent)/0.15)] text-sm font-semibold text-accent">
                  {userInitial}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-medium">
                      {user.name ?? user.email.split('@')[0]}
                    </div>
                    <div className="truncate text-[11px] text-fg-subtle">
                      {user.email}
                    </div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={collapsed ? 'start' : 'end'}
              side={collapsed ? 'right' : 'top'}
              className="w-[220px]"
            >
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
                <Settings className="h-4 w-4" /> Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={handleLogout}>
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 overflow-hidden bg-bg">
        <Outlet />
      </main>
    </div>
  );
}
