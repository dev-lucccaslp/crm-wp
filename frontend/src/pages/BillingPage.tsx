import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ExternalLink, Sparkles } from 'lucide-react';
import {
  billingService,
  formatBRL,
  type PlanId,
  type SubscriptionStatus,
} from '../services/billing';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/cn';

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIAL: 'Trial',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Atrasada',
  BLOCKED: 'Bloqueada',
  CANCELED: 'Cancelada',
  INCOMPLETE: 'Incompleta',
};

function statusVariant(
  s: SubscriptionStatus,
): 'success' | 'warning' | 'error' | 'default' {
  if (s === 'ACTIVE') return 'success';
  if (s === 'TRIAL') return 'warning';
  if (s === 'PAST_DUE' || s === 'INCOMPLETE') return 'warning';
  if (s === 'BLOCKED' || s === 'CANCELED') return 'error';
  return 'default';
}

export default function BillingPage() {
  const { data: plans } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: billingService.plans,
  });
  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['billing', 'current'],
    queryFn: billingService.current,
  });

  const checkoutMut = useMutation({
    mutationFn: (planId: PlanId) => billingService.checkout(planId),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  const portalMut = useMutation({
    mutationFn: () => billingService.portal(),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url;
    },
  });

  // Preview do próximo ciclo: base + extras (agentes + workspaces).
  const currentPlan = plans?.find((p) => p.id === sub?.plan);
  const previewCents = currentPlan
    ? currentPlan.priceCents +
      (sub?.extraAgents ?? 0) * currentPlan.extraAgentCents +
      (sub?.extraWorkspaces ?? 0) * currentPlan.extraWorkspaceCents
    : 0;

  return (
    <div className="h-full w-full overflow-y-auto bg-bg">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Plano & Cobrança</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Gerencie seu plano, faturas e método de pagamento.
            </p>
          </div>
          {sub?.stripeCustomerId && (
            <Button
              variant="outline"
              size="sm"
              loading={portalMut.isPending}
              onClick={() => portalMut.mutate()}
              className="gap-2"
            >
              Portal Stripe
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <section className="mt-6 rounded-xl border border-default bg-surface p-5 shadow-card">
          {subLoading || !sub ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-fg-muted">Plano atual</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-fg">
                    {sub.planName}
                  </h2>
                  <Badge variant={statusVariant(sub.status)}>
                    {STATUS_LABEL[sub.status] ?? sub.status}
                  </Badge>
                </div>
                {sub.status === 'TRIAL' && sub.trialEndsAt && (
                  <p className="mt-1 text-xs text-fg-muted">
                    Teste termina em{' '}
                    {new Date(sub.trialEndsAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {sub.currentPeriodEnd && sub.status !== 'TRIAL' && (
                  <p className="mt-1 text-xs text-fg-muted">
                    {sub.cancelAtPeriodEnd ? 'Termina em ' : 'Renova em '}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {sub.status === 'BLOCKED' && sub.blockReason && (
                  <p className="mt-1 text-xs text-danger">
                    Motivo: {sub.blockReason}
                  </p>
                )}
              </div>

              {/* Preview próximo ciclo + breakdown de extras */}
              {currentPlan && (
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wide text-fg-subtle">
                    Próxima fatura estimada
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-fg">
                    {formatBRL(previewCents)}
                  </div>
                  <div className="mt-1 space-y-0.5 text-[11px] text-fg-muted">
                    <div>
                      Base {sub.planName}: {formatBRL(currentPlan.priceCents)}
                    </div>
                    {sub.extraAgents > 0 && (
                      <div>
                        {sub.extraAgents} agente(s) extra ×{' '}
                        {formatBRL(currentPlan.extraAgentCents)}
                      </div>
                    )}
                    {sub.extraWorkspaces > 0 && (
                      <div>
                        {sub.extraWorkspaces} workspace(s) extra ×{' '}
                        {formatBRL(currentPlan.extraWorkspaceCents)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Limites */}
        {sub && (
          <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <LimitCard label="Agentes" value={sub.limits.seats} />
            <LimitCard label="Workspaces" value={sub.limits.workspaces} />
            <LimitCard
              label="Instâncias WhatsApp"
              value={sub.limits.whatsappInstances}
            />
            <LimitCard label="Boards" value={sub.limits.kanbanBoards} />
            <LimitCard label="Automações" value={sub.limits.automationRules} />
          </section>
        )}

        <h3 className="mt-10 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Planos disponíveis
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans?.map((p) => {
            const isCurrent = sub?.plan === p.id;
            const isTrialPlan = p.id === 'TRIAL';
            return (
              <div
                key={p.id}
                className={cn(
                  'relative flex flex-col rounded-xl border bg-surface p-5 shadow-card transition',
                  isCurrent
                    ? 'border-accent ring-1 ring-[hsl(var(--accent)/0.3)]'
                    : 'border-default hover:border-strong',
                )}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-fg">
                    Atual
                  </span>
                )}
                <h4 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
                  {p.name}
                </h4>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-fg tabular-nums">
                    {formatBRL(p.priceCents)}
                  </span>
                  <span className="text-xs text-fg-muted">/ mês</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-fg">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Plano atual
                    </Button>
                  ) : isTrialPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Incluído no signup
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      loading={
                        checkoutMut.isPending && checkoutMut.variables === p.id
                      }
                      onClick={() => checkoutMut.mutate(p.id)}
                    >
                      {sub?.plan === 'TRIAL'
                        ? `Ativar ${p.name}`
                        : `Mudar para ${p.name}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LimitCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-default bg-surface p-3">
      <div className="text-[10px] uppercase tracking-wide text-fg-subtle">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-fg">
        {value}
      </div>
    </div>
  );
}
