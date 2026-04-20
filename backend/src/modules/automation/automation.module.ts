import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [WhatsappModule, BillingModule],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
