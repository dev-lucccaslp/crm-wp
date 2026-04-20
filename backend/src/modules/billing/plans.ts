import { PlanId } from '@prisma/client';

export interface PlanLimits {
  whatsappInstances: number;
  kanbanBoards: number;
  automationRules: number;
  seats: number;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  priceMonthly: number;
  stripePriceEnvKey: 'STRIPE_PRICE_PRO' | 'STRIPE_PRICE_ENTERPRISE' | null;
  limits: PlanLimits;
  features: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    priceMonthly: 0,
    stripePriceEnvKey: null,
    limits: { whatsappInstances: 1, kanbanBoards: 1, automationRules: 3, seats: 2 },
    features: ['1 instância WhatsApp', '1 board Kanban', '3 automações', '2 usuários'],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    priceMonthly: 99,
    stripePriceEnvKey: 'STRIPE_PRICE_PRO',
    limits: { whatsappInstances: 5, kanbanBoards: 10, automationRules: 50, seats: 10 },
    features: ['5 instâncias WhatsApp', '10 boards', '50 automações', '10 usuários'],
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    priceMonthly: 299,
    stripePriceEnvKey: 'STRIPE_PRICE_ENTERPRISE',
    limits: {
      whatsappInstances: 999,
      kanbanBoards: 999,
      automationRules: 999,
      seats: 999,
    },
    features: ['Instâncias ilimitadas', 'Boards ilimitados', 'Automações ilimitadas', 'Suporte prioritário'],
  },
};

export type LimitFeature = keyof PlanLimits;

export function planRank(plan: PlanId): number {
  return plan === 'FREE' ? 0 : plan === 'PRO' ? 1 : 2;
}
