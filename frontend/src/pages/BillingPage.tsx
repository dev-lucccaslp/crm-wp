import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ExternalLink, Sparkles } from 'lucide-react';
import { billingService, type PlanId } from '../services/billing';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/cn';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativa',
  TRIALING: 'Trial',
  PAST_DUE: 'Atrasada',
  CANCELED: 'Cancelada',
  INCOMPLETE: 'Incompleta',
};

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
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-fg-muted">Plano atual</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-fg">
                    {sub.planName}
                  </h2>
                  <Badge
                    variant={sub.status === 'ACTIVE' || sub.status === 'TRIALING' ? 'success' : 'warning'}
                  >
                    {STATUS_LABEL[sub.status] ?? sub.status}
                  </Badge>
                </div>
                {sub.currentPeriodEnd && (
                  <p className="mt-1 text-xs text-fg-muted">
                    {sub.cancelAtPeriodEnd ? 'Termina em ' : 'Renova em '}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-right text-xs">
                <dt className="text-fg-muted">Instâncias WhatsApp</dt>
                <dd className="font-medium text-fg tabular-nums">até {sub.limits.whatsappInstances}</dd>
                <dt className="text-fg-muted">Boards</dt>
                <dd className="font-medium text-fg tabular-nums">até {sub.limits.kanbanBoards}</dd>
                <dt className="text-fg-muted">Automações</dt>
                <dd className="font-medium text-fg tabular-nums">até {sub.limits.automationRules}</dd>
                <dt className="text-fg-muted">Usuários</dt>
                <dd className="font-medium text-fg tabular-nums">até {sub.limits.seats}</dd>
              </dl>
            </div>
          )}
        </section>

        <h3 className="mt-10 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Planos disponíveis
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans?.map((p) => {
            const isCurrent = sub?.plan === p.id;
            const isFree = p.id === 'FREE';
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
                    R$ {p.priceMonthly}
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
                  ) : isFree ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!sub?.stripeCustomerId}
                      onClick={() => portalMut.mutate()}
                    >
                      Fazer downgrade
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      loading={checkoutMut.isPending && checkoutMut.variables === p.id}
                      onClick={() => checkoutMut.mutate(p.id)}
                    >
                      {sub?.plan === 'FREE' ? 'Assinar' : 'Mudar para ' + p.name}
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
