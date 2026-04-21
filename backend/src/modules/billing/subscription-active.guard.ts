import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * Marca rotas que DEVEM continuar acessíveis mesmo com assinatura inativa
 * (ex.: /billing/checkout, /billing/portal, /auth/*, /workspaces).
 * Uso: `@AllowInactiveSub()` no controller ou handler.
 */
export const ALLOW_INACTIVE_SUB_KEY = 'allow_inactive_sub';
export const AllowInactiveSub = () => SetMetadata(ALLOW_INACTIVE_SUB_KEY, true);

/**
 * Bloqueia acesso quando a assinatura do workspace está:
 *  - BLOCKED (past_due > 3d) / CANCELED
 *  - TRIAL com trialEndsAt vencido
 * Só avalia se `req.workspace.id` estiver presente (set por WorkspaceGuard).
 */
@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const allow = this.reflector.getAllAndOverride<boolean | undefined>(
      ALLOW_INACTIVE_SUB_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (allow) return true;

    const req = ctx.switchToHttp().getRequest();
    const workspaceId: string | undefined = req.workspace?.id;
    if (!workspaceId) return true; // rota fora do contexto de workspace

    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });
    if (!sub) return true; // sem subscription ainda → permite (signup recém criado)

    if (sub.status === 'BLOCKED' || sub.status === 'CANCELED') {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_BLOCKED',
        message:
          sub.blockReason ??
          'Assinatura inativa. Ative seu plano para continuar.',
      });
    }
    if (sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
      throw new ForbiddenException({
        code: 'TRIAL_EXPIRED',
        message: 'Seu período de teste expirou. Ative um plano para continuar.',
      });
    }
    return true;
  }
}
