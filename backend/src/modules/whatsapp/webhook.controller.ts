import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WhatsappService } from './whatsapp.service';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  constructor(private readonly svc: WhatsappService) {}

  @Public()
  @HttpCode(200)
  @Post(':secret')
  handle(@Param('secret') secret: string, @Body() payload: any) {
    return this.svc.handleWebhook(secret, payload);
  }
}
