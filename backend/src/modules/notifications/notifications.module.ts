import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { EmailProvider } from './email.provider';
import { ConsoleEmailProvider } from './console-email.provider';
import { ResendEmailProvider } from './resend-email.provider';
import { TrialNotificationsService } from './trial-notifications.service';
import type { Env } from '../../shared/config/env';

/**
 * Binding do EmailProvider decidido em runtime:
 * - RESEND_API_KEY presente → Resend
 * - caso contrário → ConsoleEmailProvider (dev/stub)
 */
const EmailProviderBinding = {
  provide: EmailProvider,
  useFactory: (config: ConfigService<Env, true>) => {
    const hasResend = !!config.get('RESEND_API_KEY', { infer: true });
    return hasResend
      ? new ResendEmailProvider(config)
      : new ConsoleEmailProvider();
  },
  inject: [ConfigService],
};

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EmailProviderBinding, TrialNotificationsService],
  exports: [EmailProvider],
})
export class NotificationsModule {}
