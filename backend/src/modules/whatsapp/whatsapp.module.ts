import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { EvolutionWebhookController } from './webhook.controller';
import { WhatsappService } from './whatsapp.service';
import { EvolutionApiClient } from './evolution-api.client';

@Module({
  controllers: [WhatsappController, EvolutionWebhookController],
  providers: [WhatsappService, EvolutionApiClient],
  exports: [WhatsappService],
})
export class WhatsappModule {}
