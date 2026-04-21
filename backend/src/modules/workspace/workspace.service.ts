import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { slugify, randomSuffix } from '../../shared/utils/slug';
import { seedDefaultBoard } from '../../shared/utils/seed-default-board';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = `${slugify(dto.name) || 'workspace'}-${randomSuffix()}`;
    const workspace = await this.prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          memberships: { create: { userId, role: 'OWNER' } },
        },
      });
      await seedDefaultBoard(tx, ws.id);
      return ws;
    });
    return { id: workspace.id, name: workspace.name, slug: workspace.slug, role: 'OWNER' as Role };
  }

  async listMembers(workspaceId: string) {
    const members = await this.prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
    }));
  }

  async inviteMember(workspaceId: string, email: string, role: Role = 'USER') {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException(
        'Usuário com este e-mail não existe. (Convite por e-mail será adicionado em fase futura.)',
      );
    }

    const existing = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (existing) throw new ConflictException('Usuário já é membro');

    const membership = await this.prisma.membership.create({
      data: { userId: user.id, workspaceId, role },
    });
    return { membershipId: membership.id, userId: user.id, role: membership.role };
  }

  async updateMemberRole(workspaceId: string, membershipId: string, role: Role) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });
    if (!membership) throw new NotFoundException('Membro não encontrado');

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { role },
    });
  }

  async removeMember(workspaceId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });
    if (!membership) throw new NotFoundException('Membro não encontrado');
    await this.prisma.membership.delete({ where: { id: membershipId } });
    return { success: true };
  }
}
