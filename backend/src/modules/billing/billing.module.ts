import { Module } from '@nestjs/common';

import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PlanGuard } from './plan.guard';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, StripeService, PlanGuard],
  exports: [BillingService, PlanGuard],
})
export class BillingModule {}
