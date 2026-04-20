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
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  ChevronsUpDown,
  Menu,
  X,
  Search as SearchIcon,
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
import { CommandPalette } from '../components/CommandPalette';
import { PageTransition } from '../components/PageTransition';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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

const ADMIN_ITEM: NavItem = {
  to: '/app/admin',
  label: 'Super Admin',
  icon: ShieldCheck,
};

export default function AppShell() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    setMobileSidebar,
    toggleMobileSidebar,
  } = useUiStore();
  const location = useLocation();
  // Fecha o drawer mobile ao navegar
  useEffect(() => {
    setMobileSidebar(false);
  }, [location.pathname, setMobileSidebar]);
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
      <CommandPalette />

      {/* Top bar mobile */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-2 border-b border-default bg-surface px-3 md:hidden">
        <button
          onClick={toggleMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-hover"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">
            C
          </div>
          <span className="text-sm font-semibold">CRM-WP</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => {
            const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            window.dispatchEvent(ev);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-hover"
          aria-label="Buscar (⌘K)"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Backdrop mobile */}
      {mobileSidebarOpen && (
        <button
          onClick={() => setMobileSidebar(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-default bg-surface transition-[width,transform] duration-200 ease-out',
          // desktop: largura dinâmica
          collapsed ? 'md:w-[68px]' : 'md:w-[240px]',
          // mobile: drawer fixo
          'fixed inset-y-0 left-0 z-40 w-[260px] md:static md:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
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
            <div className="flex items-center gap-1">
              <QuickTooltip content="Recolher sidebar" side="right">
                <button
                  onClick={toggleSidebar}
                  className="hidden h-8 w-8 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg md:flex"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </QuickTooltip>
              <button
                onClick={() => setMobileSidebar(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition hover:bg-surface-hover hover:text-fg md:hidden"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
          {(user.isSuperAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS).map((item) => {
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
                <item.icon
                  className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-[18px] w-[18px]')}
                  strokeWidth={2}
                />
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
                <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={2} />
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
                  <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
                ) : (
                  <Moon className="h-[18px] w-[18px]" strokeWidth={2} />
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
      <main className="flex flex-1 overflow-hidden bg-bg pt-12 md:pt-0">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
