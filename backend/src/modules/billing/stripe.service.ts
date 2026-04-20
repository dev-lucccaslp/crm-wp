import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe = require('stripe');

import type { Env } from '../../shared/config/env';
import type { StripeClient, StripeEvent } from './stripe-types';

@Injectable()
export class StripeService {
  private readonly log = new Logger(StripeService.name);
  private client: StripeClient | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {
    const key = config.get('STRIPE_SECRET_KEY', { infer: true });
    if (key) {
      this.client = new Stripe(key);
    } else {
      this.log.warn('STRIPE_SECRET_KEY not set — billing runs in offline mode');
    }
  }

  get enabled() {
    return !!this.client;
  }

  get stripe(): StripeClient {
    if (!this.client) {
      throw new Error('Stripe not configured (set STRIPE_SECRET_KEY)');
    }
    return this.client;
  }

  constructEvent(rawBody: Buffer, signature: string): StripeEvent {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
