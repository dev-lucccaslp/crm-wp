import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessage, EmailProvider } from './email.provider';
import type { Env } from '../../shared/config/env';

/**
 * Provider Resend — ativado quando RESEND_API_KEY estiver presente.
 * O SDK é importado dinamicamente para não exigir a dependência em dev.
 */
@Injectable()
export class ResendEmailProvider extends EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private client: { emails: { send: (p: unknown) => Promise<unknown> } } | null =
    null;

  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  private async getClient() {
    if (this.client) return this.client;
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    if (!apiKey) throw new Error('RESEND_API_KEY ausente');
    // Import dinâmico — instale `resend` quando for habilitar em prod.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- optional peer dep
    const mod = (await import('resend').catch(() => null)) as
      | { Resend: new (k: string) => typeof this.client extends infer T ? T : never }
      | null;
    if (!mod) throw new Error('Pacote `resend` não instalado');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.client = new (mod as any).Resend(apiKey);
    return this.client!;
  }

  async send(msg: EmailMessage): Promise<void> {
    const from = this.config.get('EMAIL_FROM', { infer: true });
    try {
      const client = await this.getClient();
      await client.emails.send({
        from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
    } catch (err) {
      this.logger.error(
        `Falha ao enviar email via Resend para ${msg.to}: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
