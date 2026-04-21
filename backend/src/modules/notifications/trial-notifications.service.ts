import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { EmailProvider } from './email.provider';
import type { Env } from '../../shared/config/env';

/** Gatilhos em ms (mesma escala do TrialBanner no frontend). */
const TRIGGERS = [
  { key: '2d', ms: 2 * 24 * 60 * 60 * 1000, label: '2 dias' },
  { key: '1d', ms: 24 * 60 * 60 * 1000, label: '1 dia' },
  { key: '12h', ms: 12 * 60 * 60 * 1000, label: '12 horas' },
  { key: '6h', ms: 6 * 60 * 60 * 1000, label: '6 horas' },
  { key: '1h', ms: 60 * 60 * 1000, label: '1 hora' },
  { key: '30m', ms: 30 * 60 * 1000, label: '30 minutos' },
] as const;

@Injectable()
export class TrialNotificationsService {
  private readonly logger = new Logger(TrialNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailProvider,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Varre trials ativos a cada hora e dispara e-mails pendentes. */
  @Cron(CronExpression.EVERY_HOUR)
  async scanTrials(): Promise<void> {
    const now = Date.now();
    const in2d = new Date(now + 2 * 24 * 60 * 60 * 1000);

    const subs = await this.prisma.subscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: { not: null, lte: in2d },
      },
      include: {
        workspace: {
          include: {
            memberships: {
              where: { role: 'ADMIN' },
              include: { user: true },
            },
          },
        },
      },
    });

    for (const sub of subs) {
      if (!sub.trialEndsAt) continue;
      const msLeft = sub.trialEndsAt.getTime() - now;
      const pending = TRIGGERS.filter(
        (t) => msLeft <= t.ms && !sub.notifiedTriggers.includes(t.key),
      );
      if (!pending.length) continue;

      // O gatilho mais próximo (menor ms) domina a mensagem enviada.
      const trigger = pending[pending.length - 1];
      const recipients = sub.workspace.memberships
        .map((m) => m.user.email)
        .filter(Boolean);

      for (const to of recipients) {
        await this.email
          .send(this.renderTrialExpiring(to, trigger.label, sub.workspace.name))
          .catch((err) =>
            this.logger.warn(
              `Email falhou p/ ${to} (${sub.id}): ${(err as Error).message}`,
            ),
          );
      }

      const newKeys = Array.from(
        new Set([...sub.notifiedTriggers, ...pending.map((p) => p.key)]),
      );
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { notifiedTriggers: newKeys },
      });
      this.logger.log(
        `Trial notify sub=${sub.id} triggers=[${pending.map((p) => p.key).join(',')}] recipients=${recipients.length}`,
      );
    }
  }

  private renderTrialExpiring(to: string, label: string, wsName: string) {
    const base = this.config.get('APP_BASE_URL', { infer: true });
    const billingUrl = `${base}/app/settings/billing`;
    const subject = `Seu teste em "${wsName}" expira em ${label}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#111">
        <h2 style="margin:0 0 12px">Seu período de teste está acabando</h2>
        <p>Faltam <strong>${label}</strong> para o fim do seu teste no workspace
        <strong>${wsName}</strong>.</p>
        <p>Ative um plano agora para manter o acesso sem interrupção.</p>
        <p style="margin:24px 0">
          <a href="${billingUrl}"
             style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">
            Ativar meu plano
          </a>
        </p>
        <p style="color:#666;font-size:12px">Você pode cancelar a qualquer momento.</p>
      </div>`;
    const text = `Seu teste no workspace "${wsName}" expira em ${label}. Ative em ${billingUrl}`;
    return { to, subject, html, text };
  }
}
