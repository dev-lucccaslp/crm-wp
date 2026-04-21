import { PlanId } from '@prisma/client';

/**
 * Limites "duros" do plano — usados pelos guards (WhatsappInstance,
 * KanbanBoard, AutomationRule, Membership/seats, Workspace).
 * seats = agentes incluídos no plano base.
 * workspaces = número de workspaces permitidos por conta do owner.
 */
export interface PlanLimits {
  whatsappInstances: number;
  kanbanBoards: number;
  automationRules: number;
  seats: number;
  workspaces: number;
}

export interface PlanConfig {
  id: PlanId;
  name: string;
  /** Preço mensal base em centavos (R$). */
  priceCents: number;
  /** Preço por agente extra acima de `limits.seats`, em centavos. */
  extraAgentCents: number;
  /** Preço por workspace extra acima de `limits.workspaces`, em centavos. */
  extraWorkspaceCents: number;
  /** Dias de trial quando a assinatura nasce em TRIAL. */
  trialDays: number;
  stripePriceEnvKey: 'STRIPE_PRICE_PRO' | 'STRIPE_PRICE_BUSINESS' | null;
  limits: PlanLimits;
  features: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  TRIAL: {
    id: 'TRIAL',
    name: 'Trial',
    priceCents: 0,
    extraAgentCents: 0,
    extraWorkspaceCents: 0,
    trialDays: 7,
    stripePriceEnvKey: null,
    // trial libera como PRO durante 7 dias
    limits: {
      whatsappInstances: 5,
      kanbanBoards: 10,
      automationRules: 50,
      seats: 3,
      workspaces: 3,
    },
    features: [
      '7 dias grátis (exige cartão)',
      '3 agentes · 3 workspaces',
      'Acesso completo como PRO',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    priceCents: 13900,
    extraAgentCents: 1000,
    extraWorkspaceCents: 3990,
    trialDays: 0,
    stripePriceEnvKey: 'STRIPE_PRICE_PRO',
    limits: {
      whatsappInstances: 5,
      kanbanBoards: 10,
      automationRules: 50,
      seats: 3,
      workspaces: 3,
    },
    features: [
      '3 agentes incluídos (+R$ 10/agente extra)',
      '3 workspaces incluídos (+R$ 39,90/workspace extra)',
      '5 instâncias WhatsApp · 50 automações',
    ],
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'Business',
    priceCents: 34700,
    extraAgentCents: 1000,
    extraWorkspaceCents: 3990,
    trialDays: 0,
    stripePriceEnvKey: 'STRIPE_PRICE_BUSINESS',
    limits: {
      whatsappInstances: 20,
      kanbanBoards: 50,
      automationRules: 200,
      seats: 12,
      workspaces: 10,
    },
    features: [
      '12 agentes incluídos (+R$ 10/agente extra)',
      '10 workspaces incluídos (+R$ 39,90/workspace extra)',
      '20 instâncias WhatsApp · 200 automações',
    ],
  },
};

export type LimitFeature = keyof PlanLimits;

export function planRank(plan: PlanId): number {
  return plan === 'TRIAL' ? 0 : plan === 'PRO' ? 1 : 2;
}

/** Converte centavos em string R$ formatado (para UI e e-mails). */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
