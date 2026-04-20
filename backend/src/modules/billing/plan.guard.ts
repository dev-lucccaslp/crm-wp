import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanId } from '@prisma/client';

import { BillingService } from './billing.service';
import { planRank } from './plans';

export const REQUIRES_PLAN_KEY = 'requires_plan';
export const RequiresPlan = (plan: PlanId) => SetMetadata(REQUIRES_PLAN_KEY, plan);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billing: BillingService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PlanId | undefined>(
      REQUIRES_PLAN_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required) return true;
    const req = ctx.switchToHttp().getRequest();
    const workspaceId: string | undefined = req.workspace?.id;
    if (!workspaceId) throw new ForbiddenException('Workspace não identificado');
    const current = await this.billing.getEffectivePlan(workspaceId);
    if (planRank(current) < planRank(required)) {
      throw new ForbiddenException(
        `Este recurso exige o plano ${required}. Plano atual: ${current}.`,
      );
    }
    return true;
  }
}
