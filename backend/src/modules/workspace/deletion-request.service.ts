import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeletionRequestType } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

/** Carência padrão entre pedido e efetivação (7 dias). */
const GRACE_DAYS = 7;

@Injectable()
export class DeletionRequestService {
  private readonly log = new Logger(DeletionRequestService.name);
  constructor(private readonly prisma: PrismaService) {}

  async request(params: {
    workspaceId: string;
    userId: string;
    type: DeletionRequestType;
    reason?: string;
  }) {
    // Apenas o OWNER do workspace pode solicitar exclusão.
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: params.userId,
          workspaceId: params.workspaceId,
        },
      },
    });
    if (!membership || membership.role !== 'OWNER') {
      throw new ForbiddenException('Apenas o OWNER pode solicitar exclusão');
    }

    const existing = await this.prisma.deletionRequest.findFirst({
      where: {
        workspaceId: params.workspaceId,
        type: params.type,
        status: 'PENDING',
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Já existe um pedido pendente para este workspace',
      );
    }

    const scheduledFor = new Date(Date.now() + GRACE_DAYS * 86_400_000);
    return this.prisma.deletionRequest.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        type: params.type,
        reason: params.reason,
        scheduledFor,
      },
    });
  }

  async cancel(workspaceId: string, userId: string, requestId: string) {
    const req = await this.prisma.deletionRequest.findFirst({
      where: { id: requestId, workspaceId },
    });
    if (!req) throw new NotFoundException('Pedido não encontrado');
    if (req.status !== 'PENDING') {
      throw new BadRequestException('Pedido não está mais pendente');
    }
    if (req.userId !== userId) {
      // Só o OWNER que solicitou pode cancelar.
      throw new ForbiddenException('Apenas quem solicitou pode cancelar');
    }
    return this.prisma.deletionRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
  }

  list(workspaceId: string) {
    return this.prisma.deletionRequest.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Executa pedidos vencidos a cada hora. Em fase futura, ACCOUNT remove
   * também o User + todos seus workspaces órfãos — por ora, apenas WORKSPACE.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduled() {
    const due = await this.prisma.deletionRequest.findMany({
      where: { status: 'PENDING', scheduledFor: { lte: new Date() } },
    });
    for (const r of due) {
      try {
        await this.prisma.$transaction(async (tx) => {
          if (r.type === 'WORKSPACE') {
            await tx.workspace.delete({ where: { id: r.workspaceId } });
          } else {
            // ACCOUNT: apaga todos os workspaces onde é OWNER + o usuário.
            const owned = await tx.membership.findMany({
              where: { userId: r.userId, role: 'OWNER' },
              select: { workspaceId: true },
            });
            for (const m of owned) {
              await tx.workspace.delete({ where: { id: m.workspaceId } });
            }
            await tx.user.delete({ where: { id: r.userId } });
          }
          await tx.deletionRequest.update({
            where: { id: r.id },
            data: { status: 'EXECUTED', executedAt: new Date() },
          });
        });
        this.log.log(`DeletionRequest ${r.id} (${r.type}) executado`);
      } catch (err) {
        this.log.error(
          `Falha ao executar DeletionRequest ${r.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}
