import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { EvolutionWebhookController } from './webhook.controller';
import { WhatsappService } from './whatsapp.service';
import { EvolutionApiClient } from './evolution-api.client';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [WhatsappController, EvolutionWebhookController],
  providers: [WhatsappService, EvolutionApiClient],
  exports: [WhatsappService, EvolutionApiClient],
})
export class WhatsappModule {}
