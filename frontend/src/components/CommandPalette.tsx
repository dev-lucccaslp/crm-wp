import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  MessageSquare,
  Kanban,
  Smartphone,
  Zap,
  Users,
  BarChart2,
  CreditCard,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Search,
  type LucideIcon,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

import { useAuthStore } from '../store/auth-store';
import { useTheme } from '../hooks/useTheme';
import { authService } from '../services/auth';

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void | Promise<void>;
  keywords?: string[];
  group: 'Navegar' | 'Ações';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const reset = useAuthStore((s) => s.reset);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setCursor(0);
    }
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const go = (to: string) => () => {
      navigate(to);
      setOpen(false);
    };
    const base: Cmd[] = [
      { id: 'nav-dashboard', group: 'Navegar', label: 'Dashboard', icon: LayoutGrid, run: go('/app') },
      { id: 'nav-chat', group: 'Navegar', label: 'Chat', icon: MessageSquare, run: go('/app/chat') },
      { id: 'nav-kanban', group: 'Navegar', label: 'Kanban', icon: Kanban, run: go('/app/kanban') },
      { id: 'nav-whatsapp', group: 'Navegar', label: 'WhatsApp', icon: Smartphone, run: go('/app/whatsapp') },
      { id: 'nav-auto', group: 'Navegar', label: 'Automações', icon: Zap, run: go('/app/automations') },
      { id: 'nav-contacts', group: 'Navegar', label: 'Contatos', icon: Users, run: go('/app/contacts') },
      { id: 'nav-reports', group: 'Navegar', label: 'Relatórios', icon: BarChart2, run: go('/app/reports') },
      { id: 'nav-billing', group: 'Navegar', label: 'Plano', icon: CreditCard, run: go('/app/billing') },
      { id: 'nav-settings', group: 'Navegar', label: 'Configurações', icon: Settings, run: go('/app/settings') },
    ];
    if (user?.isSuperAdmin) {
      base.push({ id: 'nav-admin', group: 'Navegar', label: 'Super Admin', icon: ShieldCheck, run: go('/app/admin') });
    }
    base.push(
      {
        id: 'act-theme',
        group: 'Ações',
        label: theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro',
        icon: theme === 'dark' ? Sun : Moon,
        run: () => {
          toggle();
          setOpen(false);
        },
        keywords: ['tema', 'dark', 'light'],
      },
      {
        id: 'act-logout',
        group: 'Ações',
        label: 'Sair',
        icon: LogOut,
        run: async () => {
          if (refreshToken) {
            try { await authService.logout(refreshToken); } catch { /* ignore */ }
          }
          reset();
          navigate('/login', { replace: true });
          setOpen(false);
        },
        keywords: ['logout', 'sign out'],
      },
    );
    return base;
  }, [navigate, theme, toggle, user?.isSuperAdmin, refreshToken, reset]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      [c.label, ...(c.keywords ?? [])].some((s) => s.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const groups = useMemo(() => {
    const map = new Map<string, Cmd[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[cursor]?.run();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[15%] z-50 w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-xl border border-default bg-surface shadow-2xl data-[state=open]:animate-scale-in"
        >
          <Dialog.Title className="sr-only">Paleta de comandos</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-default px-3">
            <Search className="h-4 w-4 text-fg-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar páginas e ações…"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle"
            />
            <kbd className="hidden shrink-0 rounded border border-default px-1.5 py-0.5 text-[10px] text-fg-subtle sm:inline">
              ESC
            </kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-fg-subtle">
                Nenhum resultado.
              </div>
            )}
            {groups.map(([group, items]) => (
              <div key={group} className="px-1 py-1">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-fg-subtle">
                  {group}
                </div>
                {items.map((c) => {
                  const idx = filtered.indexOf(c);
                  const active = idx === cursor;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => c.run()}
                      className={
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition ' +
                        (active
                          ? 'bg-[hsl(var(--accent)/0.12)] text-accent'
                          : 'text-fg hover:bg-surface-hover')
                      }
                    >
                      <c.icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && (
                        <span className="text-[10px] text-fg-subtle">{c.hint}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-default px-3 py-1.5 text-[10px] text-fg-subtle">
            <span>↑↓ navegar · ↵ selecionar</span>
            <span>⌘K</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
