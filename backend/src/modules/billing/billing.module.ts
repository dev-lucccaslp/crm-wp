import { Module } from '@nestjs/common';

import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PlanGuard } from './plan.guard';
import { PlanLimitGuard } from './plan-limit.guard';
import { SubscriptionActiveGuard } from './subscription-active.guard';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [
    BillingService,
    StripeService,
    PlanGuard,
    PlanLimitGuard,
    SubscriptionActiveGuard,
  ],
  exports: [
    BillingService,
    PlanGuard,
    PlanLimitGuard,
    SubscriptionActiveGuard,
    StripeService,
  ],
})
export class BillingModule {}
