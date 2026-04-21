import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from './billing.service';
import type { LimitFeature } from './plans';

/**
 * Decorator para exigir que o workspace esteja abaixo do limite do feature
 * informado antes de executar a rota. Ex.: `@EnforcesLimit('whatsappInstances')`.
 */
export const ENFORCES_LIMIT_KEY = 'enforces_limit';
export const EnforcesLimit = (feature: LimitFeature) =>
  SetMetadata(ENFORCES_LIMIT_KEY, feature);

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billing: BillingService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<LimitFeature | undefined>(
      ENFORCES_LIMIT_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!feature) return true;

    const req = ctx.switchToHttp().getRequest();
    const workspaceId: string | undefined = req.workspace?.id;
    if (!workspaceId) {
      throw new ForbiddenException('Workspace não identificado');
    }
    // Reaproveita a lógica de contagem/validação de limites já no BillingService.
    await this.billing.ensureWithinLimit(workspaceId, feature);
    return true;
  }
}
