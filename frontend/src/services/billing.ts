import { api } from './api';

export type PlanId = 'FREE' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'INCOMPLETE';

export interface PlanLimits {
  whatsappInstances: number;
  kanbanBoards: number;
  automationRules: number;
  seats: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
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
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  limits: PlanLimits;
}

export const billingService = {
  plans: () => api.get<Plan[]>('/billing/plans').then((r) => r.data),
  current: () => api.get<Subscription>('/billing').then((r) => r.data),
  checkout: (planId: PlanId) =>
    api.post<{ url: string }>('/billing/checkout', { planId }).then((r) => r.data),
  portal: () => api.post<{ url: string }>('/billing/portal').then((r) => r.data),
};
