import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlanId, SubscriptionStatus } from '@prisma/client';
import type {
  StripeEvent,
  StripeSubscription,
  StripeInvoice,
  StripeCheckoutSession,
} from './stripe-types';

import { PrismaService } from '../../infra/prisma/prisma.service';
import type { Env } from '../../shared/config/env';
import { PLANS, type LimitFeature } from './plans';
import { StripeService } from './stripe.service';

@Injectable()
export class BillingService {
  private readonly log = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ─────────────────────────── Queries ───────────────────────────

  async getSubscription(workspaceId: string) {
    const sub = await this.prisma.subscription.upsert({
      where: { workspaceId },
      update: {},
      create: { workspaceId, plan: 'FREE', status: 'ACTIVE' },
    });
    const plan = PLANS[sub.plan];
    return { ...sub, limits: plan.limits, planName: plan.name };
  }

  listPlans() {
    return Object.values(PLANS).map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthly: p.priceMonthly,
      limits: p.limits,
      features: p.features,
    }));
  }

  async getEffectivePlan(workspaceId: string): Promise<PlanId> {
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });
    if (!sub) return 'FREE';
    const activeStatuses: SubscriptionStatus[] = ['ACTIVE', 'TRIALING'];
    return activeStatuses.includes(sub.status) ? sub.plan : 'FREE';
  }

  // ─────────────────────────── Limits ───────────────────────────

  async ensureWithinLimit(workspaceId: string, feature: LimitFeature) {
    const plan = await this.getEffectivePlan(workspaceId);
    const limit = PLANS[plan].limits[feature];
    const current = await this.countFeature(workspaceId, feature);
    if (current >= limit) {
      throw new ForbiddenException(
        `Limite do plano ${plan} atingido para ${feature} (${current}/${limit}). Faça upgrade.`,
      );
    }
  }

  private async countFeature(workspaceId: string, feature: LimitFeature) {
    switch (feature) {
      case 'whatsappInstances':
        return this.prisma.whatsappInstance.count({ where: { workspaceId } });
      case 'kanbanBoards':
        return this.prisma.kanbanBoard.count({ where: { workspaceId } });
      case 'automationRules':
        return this.prisma.automationRule.count({ where: { workspaceId } });
      case 'seats':
        return this.prisma.membership.count({ where: { workspaceId } });
    }
  }

  // ─────────────────────────── Checkout ───────────────────────────

  async createCheckout(workspaceId: string, userEmail: string, planId: PlanId) {
    if (!this.stripe.enabled) {
      throw new BadRequestException('Stripe não configurado neste ambiente.');
    }
    if (planId === 'FREE') {
      throw new BadRequestException('Plano Free não requer checkout.');
    }
    const cfg = PLANS[planId];
    const priceEnvKey = cfg.stripePriceEnvKey;
    if (!priceEnvKey) throw new BadRequestException('Plano inválido.');
    const priceId = this.config.get(priceEnvKey, { infer: true });
    if (!priceId) {
      throw new BadRequestException(`${priceEnvKey} não configurado.`);
    }

    const sub = await this.getSubscription(workspaceId);
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.stripe.customers.create({
        email: userEmail,
        metadata: { workspaceId },
      });
      customerId = customer.id;
      await this.prisma.subscription.update({
        where: { workspaceId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: workspaceId,
      metadata: { workspaceId, planId },
      success_url: this.config.get('BILLING_SUCCESS_URL', { infer: true })!,
      cancel_url: this.config.get('BILLING_CANCEL_URL', { infer: true })!,
    });
    return { url: session.url };
  }

  async createPortal(workspaceId: string) {
    if (!this.stripe.enabled) {
      throw new BadRequestException('Stripe não configurado.');
    }
    const sub = await this.getSubscription(workspaceId);
    if (!sub.stripeCustomerId) {
      throw new NotFoundException('Workspace ainda não tem customer StripeNS.');
    }
    const portal = await this.stripe.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: this.config.get('BILLING_SUCCESS_URL', { infer: true })!,
    });
    return { url: portal.url };
  }

  // ─────────────────────────── Webhook ───────────────────────────

  async handleWebhook(event: StripeEvent) {
    this.log.log(`stripe event ${event.type}`);
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as StripeCheckoutSession);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.onSubscriptionChange(event.data.object as StripeSubscription);
        break;
      case 'invoice.payment_failed':
        await this.onPaymentFailed(event.data.object as StripeInvoice);
        break;
    }
  }

  private async onCheckoutCompleted(session: StripeCheckoutSession) {
    const workspaceId =
      session.client_reference_id ?? (session.metadata?.workspaceId as string | undefined);
    if (!workspaceId) return;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (!subscriptionId) return;
    const sub = await this.stripe.stripe.subscriptions.retrieve(subscriptionId);
    await this.syncFromStripe(workspaceId, sub);
  }

  private async onSubscriptionChange(sub: StripeSubscription) {
    const workspaceId = (sub.metadata?.workspaceId as string | undefined) ?? null;
    const existing = workspaceId
      ? await this.prisma.subscription.findUnique({ where: { workspaceId } })
      : await this.prisma.subscription.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });
    if (!existing) return;
    await this.syncFromStripe(existing.workspaceId, sub);
  }

  private async onPaymentFailed(invoice: StripeInvoice) {
    const customerId = invoice.customer as string;
    const existing = await this.prisma.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!existing) return;
    await this.prisma.subscription.update({
      where: { workspaceId: existing.workspaceId },
      data: { status: 'PAST_DUE' },
    });
  }

  private async syncFromStripe(workspaceId: string, sub: StripeSubscription) {
    const priceId = sub.items.data[0]?.price.id;
    const plan = this.planFromPriceId(priceId);
    const status = this.mapStatus(sub.status);
    const periodEnd =
      (sub as StripeSubscription & { current_period_end?: number }).current_period_end;
    await this.prisma.subscription.update({
      where: { workspaceId },
      data: {
        plan,
        status,
        stripeSubscriptionId: sub.id,
        stripeCustomerId: sub.customer as string,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }

  private planFromPriceId(priceId: string | undefined): PlanId {
    if (!priceId) return 'FREE';
    const pro = this.config.get('STRIPE_PRICE_PRO', { infer: true });
    const ent = this.config.get('STRIPE_PRICE_ENTERPRISE', { infer: true });
    if (priceId === ent) return 'ENTERPRISE';
    if (priceId === pro) return 'PRO';
    return 'FREE';
  }

  private mapStatus(s: StripeSubscription['status']): SubscriptionStatus {
    switch (s) {
      case 'active':
        return 'ACTIVE';
      case 'trialing':
        return 'TRIALING';
      case 'past_due':
      case 'unpaid':
        return 'PAST_DUE';
      case 'canceled':
        return 'CANCELED';
      default:
        return 'INCOMPLETE';
    }
  }

  // ─────────────────────────── Cron (6.5) ───────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleOverdueSubscriptions() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const overdue = await this.prisma.subscription.findMany({
      where: { status: 'PAST_DUE', updatedAt: { lt: threeDaysAgo } },
    });
    for (const s of overdue) {
      this.log.warn(`downgrading workspace ${s.workspaceId} (past_due > 3d)`);
      await this.prisma.subscription.update({
        where: { workspaceId: s.workspaceId },
        data: { status: 'CANCELED', plan: 'FREE' },
      });
    }
  }
}
