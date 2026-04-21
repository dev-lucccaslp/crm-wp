import { useEffect, useMemo, useState } from 'react';
import { Clock, Zap } from 'lucide-react';
import { cn } from '../lib/cn';
import { useAuthStore } from '../store/auth-store';
import { useToast } from './ui/Toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { api } from '../services/api';

/**
 * Gatilhos de aviso (em ms) — usados tanto para toast único quanto para decidir
 * o estilo do banner. A ordem importa: avaliamos do mais próximo ao mais longe.
 */
const TRIGGERS = [
  { key: '30m', ms: 30 * 60 * 1000, label: '30 minutos' },
  { key: '1h', ms: 60 * 60 * 1000, label: '1 hora' },
  { key: '6h', ms: 6 * 60 * 60 * 1000, label: '6 horas' },
  { key: '12h', ms: 12 * 60 * 60 * 1000, label: '12 horas' },
  { key: '1d', ms: 24 * 60 * 60 * 1000, label: '1 dia' },
  { key: '2d', ms: 2 * 24 * 60 * 60 * 1000, label: '2 dias' },
] as const;

type Urgency = 'info' | 'warn' | 'alert' | 'danger' | 'critical';

function urgencyFor(msLeft: number): Urgency {
  if (msLeft <= 30 * 60 * 1000) return 'critical';
  if (msLeft <= 60 * 60 * 1000) return 'danger';
  if (msLeft <= 12 * 60 * 60 * 1000) return 'danger';
  if (msLeft <= 24 * 60 * 60 * 1000) return 'alert';
  if (msLeft <= 2 * 24 * 60 * 60 * 1000) return 'warn';
  return 'info';
}

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return 'expirado';
  const totalSec = Math.floor(msLeft / 1000);
  const d = Math.floor(totalSec / 86_400);
  const h = Math.floor((totalSec % 86_400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (msLeft > 2 * 86_400 * 1000) return `${d} dias`;
  if (msLeft > 86_400 * 1000) return `${d}d ${h}h`;
  if (msLeft > 3600 * 1000) return `${h}h ${m}m`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TrialBanner() {
  const currentWorkspaceId = useAuthStore((s) => s.currentWorkspaceId);
  const workspace = useAuthStore((s) =>
    s.workspaces.find((w) => w.id === s.currentWorkspaceId),
  );
  const sub = workspace?.subscription;
  const trialEndsAt = sub?.trialEndsAt;
  const { toast } = useToast();

  // Tick de 1s para countdown ao vivo — só quando banner ativo.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!trialEndsAt || sub?.status !== 'TRIAL') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [trialEndsAt, sub?.status]);

  const msLeft = useMemo(
    () => (trialEndsAt ? new Date(trialEndsAt).getTime() - now : Infinity),
    [trialEndsAt, now],
  );

  // Toasts únicos por gatilho por subscription (anti-repeat via localStorage).
  useEffect(() => {
    if (!sub || sub.status !== 'TRIAL' || !trialEndsAt) return;
    const storageKey = `trial-toasts:${currentWorkspaceId}:${trialEndsAt}`;
    const fired = new Set<string>(
      JSON.parse(localStorage.getItem(storageKey) ?? '[]'),
    );
    for (const t of TRIGGERS) {
      if (msLeft <= t.ms && !fired.has(t.key)) {
        toast({
          title: `Seu teste expira em ${t.label}`,
          description: 'Ative seu plano para manter o acesso sem interrupção.',
          variant: t.ms <= 60 * 60 * 1000 ? 'error' : 'default',
        });
        fired.add(t.key);
      }
    }
    localStorage.setItem(storageKey, JSON.stringify([...fired]));
  }, [msLeft, sub, trialEndsAt, currentWorkspaceId, toast]);

  async function activatePlan(planId: 'PRO' | 'BUSINESS') {
    try {
      const { data } = await api.post<{ url: string }>('/billing/checkout', {
        planId,
      });
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: 'Não foi possível iniciar o checkout',
        description: 'Tente novamente em instantes.',
        variant: 'error',
      });
    }
  }

  if (!sub || sub.status !== 'TRIAL' || !trialEndsAt) return null;

  const urgency = urgencyFor(msLeft);
  const expired = msLeft <= 0;
  const blocker = urgency === 'critical' && !expired;

  const styles: Record<Urgency, string> = {
    info: 'bg-[hsl(var(--accent)/0.1)] text-accent border-[hsl(var(--accent)/0.25)]',
    warn: 'bg-[hsl(var(--warning)/0.12)] text-warning border-[hsl(var(--warning)/0.35)]',
    alert: 'bg-[hsl(25_95%_55%/0.12)] text-[hsl(25_95%_55%)] border-[hsl(25_95%_55%/0.4)]',
    danger: 'bg-[hsl(var(--danger)/0.12)] text-danger border-[hsl(var(--danger)/0.4)]',
    critical:
      'bg-[hsl(var(--danger)/0.2)] text-danger border-[hsl(var(--danger)/0.6)] animate-pulse',
  };

  return (
    <>
      <div
        role="status"
        className={cn(
          'flex shrink-0 items-center gap-3 border-b px-4 py-2 text-xs md:text-sm',
          styles[urgency],
        )}
      >
        {urgency === 'info' ? (
          <Zap className="h-4 w-4 shrink-0" strokeWidth={2} />
        ) : (
          <Clock className="h-4 w-4 shrink-0" strokeWidth={2} />
        )}
        <div className="min-w-0 flex-1">
          <span className="font-medium">
            {expired ? 'Seu teste expirou.' : 'Você está no período de teste.'}
          </span>{' '}
          <span className="tabular-nums">
            {expired ? 'Ative um plano para continuar.' : `Faltam ${formatCountdown(msLeft)}.`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => activatePlan('PRO')}
          className="shrink-0 rounded-md border border-current/40 bg-current/10 px-3 py-1 text-xs font-semibold transition hover:bg-current/20"
        >
          Ativar PRO
        </button>
      </div>

      {/* Modal bloqueador quando faltam ≤30min ou já expirou */}
      <Dialog open={blocker || expired}>
        <DialogContent hideClose className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {expired ? 'Seu período de teste acabou' : 'Seu teste termina em minutos'}
            </DialogTitle>
            <DialogDescription>
              Confirme sua assinatura para manter o acesso sem interrupções.
              Você pode cancelar a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <PlanCard
              name="PRO"
              price="R$ 139"
              subtitle="3 agentes · 3 workspaces"
              onClick={() => activatePlan('PRO')}
            />
            <PlanCard
              name="BUSINESS"
              price="R$ 347"
              subtitle="12 agentes · 10 workspaces"
              onClick={() => activatePlan('BUSINESS')}
              highlight
            />
          </div>
          <DialogFooter className="mt-4 text-center text-[11px] text-fg-subtle">
            Cancele a qualquer momento no portal de assinatura.
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlanCard({
  name,
  price,
  subtitle,
  onClick,
  highlight,
}: {
  name: string;
  price: string;
  subtitle: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg border p-4 text-left transition hover:border-strong',
        highlight
          ? 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.05)]'
          : 'border-default bg-surface',
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {name}
      </div>
      <div className="mt-1 text-lg font-semibold text-fg">
        {price}
        <span className="text-xs font-normal text-fg-muted">/mês</span>
      </div>
      <div className="mt-1 text-xs text-fg-muted">{subtitle}</div>
      <Button size="sm" className="mt-3 w-full">
        Escolher {name}
      </Button>
    </button>
  );
}
