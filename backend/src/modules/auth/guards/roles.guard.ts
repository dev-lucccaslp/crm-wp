import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const role: Role | undefined = req.workspace?.role;
    // OWNER (dono do workspace) sempre passa — evita reanotar rotas de ADMIN.
    if (role === 'OWNER') return true;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException('Permissão insuficiente');
    }
    return true;
  }
}
