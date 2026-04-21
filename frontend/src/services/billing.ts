import { api } from './api';

export type PlanId = 'TRIAL' | 'PRO' | 'BUSINESS';
export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'BLOCKED'
  | 'CANCELED'
  | 'INCOMPLETE';

export interface PlanLimits {
  whatsappInstances: number;
  kanbanBoards: number;
  automationRules: number;
  seats: number;
  workspaces: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;
  extraAgentCents: number;
  extraWorkspaceCents: number;
  trialDays: number;
  limits: PlanLimits;
  features: string[];
}

export interface Subscription {
  id: string;
  workspaceId: string;
  plan: PlanId;
  planName: string;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  blockedAt: string | null;
  blockReason: string | null;
  extraAgents: number;
  extraWorkspaces: number;
  limits: PlanLimits;
}

export const billingService = {
  plans: () => api.get<Plan[]>('/billing/plans').then((r) => r.data),
  current: () => api.get<Subscription>('/billing').then((r) => r.data),
  checkout: (planId: PlanId) =>
    api.post<{ url: string }>('/billing/checkout', { planId }).then((r) => r.data),
  portal: () => api.post<{ url: string }>('/billing/portal').then((r) => r.data),
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
