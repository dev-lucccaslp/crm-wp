import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException();

    const workspaceId =
      req.headers['x-workspace-id'] ?? req.query?.workspaceId;
    if (!workspaceId || typeof workspaceId !== 'string') {
      throw new BadRequestException('Header x-workspace-id ausente');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId },
      },
    });
    if (!membership) {
      throw new ForbiddenException('Sem acesso a este workspace');
    }
    if (membership.blockedAt) {
      throw new ForbiddenException({
        code: 'MEMBERSHIP_BLOCKED',
        message: 'Seu acesso a este workspace foi bloqueado.',
      });
    }

    req.workspace = { id: workspaceId, role: membership.role };
    return true;
  }
}
