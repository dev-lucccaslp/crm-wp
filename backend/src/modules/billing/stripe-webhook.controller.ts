import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Public } from '../auth/decorators/public.decorator';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly log = new Logger(StripeWebhookController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeService,
  ) {}

  @Public()
  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!this.stripe.enabled) {
      throw new BadRequestException('Stripe not configured');
    }
    if (!req.rawBody) {
      throw new BadRequestException('Raw body missing (enable rawBody in main.ts)');
    }
    try {
      const event = this.stripe.constructEvent(req.rawBody, signature);
      await this.billing.handleWebhook(event);
      return { received: true };
    } catch (err) {
      this.log.error(`webhook invalid: ${(err as Error).message}`);
      throw new BadRequestException('Invalid signature');
    }
  }
}
