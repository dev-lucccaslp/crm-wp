import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailProvider } from './email.provider';

/** Stub de desenvolvimento — apenas loga o envio. */
@Injectable()
export class ConsoleEmailProvider extends EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);
  async send(msg: EmailMessage): Promise<void> {
    this.logger.log(
      `✉️  [email:console] to=${msg.to} subject="${msg.subject}"`,
    );
    this.logger.debug(msg.text ?? msg.html);
  }
}
