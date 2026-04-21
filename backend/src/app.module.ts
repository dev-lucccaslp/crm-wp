import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CryptoModule } from './shared/crypto/crypto.module';
import { AuditLogInterceptor } from './shared/audit/audit-log.interceptor';
import { CorrelationIdMiddleware, CORRELATION_HEADER } from './shared/http/correlation-id.middleware';
import { LoggerModule } from 'nestjs-pino';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { validateEnv } from './shared/config/env';
import { PrismaModule } from './infra/prisma/prisma.module';
import { WsModule } from './infra/websocket/ws.module';
import { HealthController } from './modules/health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { KanbanModule } from './modules/kanban/kanban.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ChatModule } from './modules/chat/chat.module';
import { AutomationModule } from './modules/automation/automation.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionActiveGuard } from './modules/billing/subscription-active.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true },
              },
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
        ],
        // correlation id: usa o atribuído pelo CorrelationIdMiddleware
        genReqId: (req, res) => {
          const existing = (req as { id?: string }).id;
          const header =
            (req.headers?.[CORRELATION_HEADER] as string | undefined) ?? existing;
          const id = header ?? undefined;
          if (id) {
            res.setHeader(CORRELATION_HEADER, id);
            return id;
          }
          return undefined as unknown as string;
        },
        customProps: (req) => ({
          reqId: (req as { id?: string }).id,
        }),
      },
    }),
    CryptoModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    WsModule,
    AuthModule,
    WorkspaceModule,
    KanbanModule,
    WhatsappModule,
    ChatModule,
    AutomationModule,
    BillingModule,
    AdminModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SubscriptionActiveGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
