import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { WsGateway, WS_EVENTS } from '../../infra/websocket/ws.gateway';

const AUTOMATION_EVENT = 'automation.trigger';
import {
  CreateBoardDto,
  UpdateBoardDto,
} from './dto/board.dto';
import {
  CreateColumnDto,
  ReorderColumnsDto,
  UpdateColumnDto,
} from './dto/column.dto';
import { CreateLeadDto, MoveLeadDto, UpdateLeadDto } from './dto/lead.dto';

@Injectable()
export class KanbanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: WsGateway,
    private readonly events: EventEmitter2,
  ) {}

  // ============ BOARDS ============

  listBoards(workspaceId: string) {
    return this.prisma.kanbanBoard.findMany({
      where: { workspaceId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async getBoardFull(workspaceId: string, boardId: string) {
    const board = await this.prisma.kanbanBoard.findFirst({
      where: { id: boardId, workspaceId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            leads: {
              orderBy: { position: 'asc' },
              include: {
                contact: { select: { id: true, name: true, phone: true, avatarUrl: true } },
                assignee: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });
    if (!board) throw new NotFoundException('Board não encontrado');
    return board;
  }

  async createBoard(workspaceId: string, dto: CreateBoardDto) {
    if (dto.isDefault) {
      await this.prisma.kanbanBoard.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.kanbanBoard.create({
      data: { workspaceId, name: dto.name, isDefault: !!dto.isDefault },
    });
  }

  async updateBoard(workspaceId: string, boardId: string, dto: UpdateBoardDto) {
    await this.assertBoard(workspaceId, boardId);
    if (dto.isDefault) {
      await this.prisma.kanbanBoard.updateMany({
        where: { workspaceId, isDefault: true, NOT: { id: boardId } },
        data: { isDefault: false },
      });
    }
    return this.prisma.kanbanBoard.update({ where: { id: boardId }, data: dto });
  }

  async deleteBoard(workspaceId: string, boardId: string) {
    await this.assertBoard(workspaceId, boardId);
    await this.prisma.kanbanBoard.delete({ where: { id: boardId } });
    return { success: true };
  }

  // ============ COLUMNS ============

  async createColumn(workspaceId: string, boardId: string, dto: CreateColumnDto) {
    await this.assertBoard(workspaceId, boardId);
    const max = await this.prisma.kanbanColumn.aggregate({
      where: { boardId },
      _max: { position: true },
    });
    const column = await this.prisma.kanbanColumn.create({
      data: {
        workspaceId,
        boardId,
        name: dto.name,
        color: dto.color ?? '#64748b',
        position: (max._max.position ?? -1) + 1,
      },
    });
    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.COLUMN_CHANGED, { boardId });
    return column;
  }

  async updateColumn(
    workspaceId: string,
    boardId: string,
    columnId: string,
    dto: UpdateColumnDto,
  ) {
    const col = await this.prisma.kanbanColumn.findFirst({
      where: { id: columnId, boardId, workspaceId },
    });
    if (!col) throw new NotFoundException('Coluna não encontrada');
    const updated = await this.prisma.kanbanColumn.update({
      where: { id: columnId },
      data: dto,
    });
    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.COLUMN_CHANGED, { boardId });
    return updated;
  }

  async deleteColumn(workspaceId: string, boardId: string, columnId: string) {
    const col = await this.prisma.kanbanColumn.findFirst({
      where: { id: columnId, boardId, workspaceId },
      include: { _count: { select: { leads: true } } },
    });
    if (!col) throw new NotFoundException('Coluna não encontrada');
    if (col._count.leads > 0) {
      throw new BadRequestException(
        'Coluna contém leads — mova-os antes de excluir',
      );
    }
    await this.prisma.kanbanColumn.delete({ where: { id: columnId } });
    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.COLUMN_CHANGED, { boardId });
    return { success: true };
  }

  async reorderColumns(
    workspaceId: string,
    boardId: string,
    dto: ReorderColumnsDto,
  ) {
    await this.assertBoard(workspaceId, boardId);
    const cols = await this.prisma.kanbanColumn.findMany({
      where: { boardId },
      select: { id: true },
    });
    const known = new Set(cols.map((c) => c.id));
    if (
      dto.columnIds.length !== cols.length ||
      dto.columnIds.some((id) => !known.has(id))
    ) {
      throw new BadRequestException('Lista de colunas inválida');
    }
    await this.prisma.$transaction(
      dto.columnIds.map((id, i) =>
        this.prisma.kanbanColumn.update({
          where: { id },
          data: { position: i },
        }),
      ),
    );
    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.COLUMN_CHANGED, { boardId });
    return { success: true };
  }

  // ============ LEADS ============

  async createLead(workspaceId: string, dto: CreateLeadDto) {
    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: dto.columnId, boardId: dto.boardId, workspaceId },
    });
    if (!column) throw new NotFoundException('Coluna inválida para este board');

    const max = await this.prisma.lead.aggregate({
      where: { columnId: dto.columnId },
      _max: { position: true },
    });

    const lead = await this.prisma.lead.create({
      data: {
        workspaceId,
        boardId: dto.boardId,
        columnId: dto.columnId,
        title: dto.title,
        contactId: dto.contactId,
        assigneeId: dto.assigneeId,
        value: dto.value,
        tags: dto.tags ?? [],
        notes: dto.notes,
        position: (max._max.position ?? -1) + 1,
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.LEAD_CREATED, lead);
    this.events.emit(AUTOMATION_EVENT, {
      type: 'lead.created',
      workspaceId,
      leadId: lead.id,
      columnId: lead.columnId,
      contactId: lead.contactId,
    });
    return lead;
  }

  async updateLead(workspaceId: string, leadId: string, dto: UpdateLeadDto) {
    await this.assertLead(workspaceId, leadId);
    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: dto,
      include: {
        contact: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.LEAD_UPDATED, lead);
    return lead;
  }

  async deleteLead(workspaceId: string, leadId: string) {
    await this.assertLead(workspaceId, leadId);
    await this.prisma.lead.delete({ where: { id: leadId } });
    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.LEAD_DELETED, { id: leadId });
    return { success: true };
  }

  async getLead(workspaceId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId },
      include: {
        contact: true,
        assignee: { select: { id: true, name: true, email: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            fromColumn: { select: { id: true, name: true } },
            toColumn: { select: { id: true, name: true } },
            movedBy: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
    return lead;
  }

  async moveLead(
    workspaceId: string,
    userId: string,
    leadId: string,
    dto: MoveLeadDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: { id: leadId, workspaceId },
      });
      if (!lead) throw new NotFoundException('Lead não encontrado');

      const target = await tx.kanbanColumn.findFirst({
        where: { id: dto.toColumnId, boardId: lead.boardId, workspaceId },
      });
      if (!target) throw new BadRequestException('Coluna destino inválida');

      const fromColumnId = lead.columnId;
      const sameColumn = fromColumnId === dto.toColumnId;

      // leads in target column except the moved one
      const targetLeads = await tx.lead.findMany({
        where: {
          columnId: dto.toColumnId,
          NOT: { id: leadId },
        },
        orderBy: { position: 'asc' },
        select: { id: true },
      });

      const clamped = Math.max(0, Math.min(dto.toPosition, targetLeads.length));
      const reordered = [
        ...targetLeads.slice(0, clamped).map((l) => l.id),
        leadId,
        ...targetLeads.slice(clamped).map((l) => l.id),
      ];

      // update moved lead first (column + tentative position)
      await tx.lead.update({
        where: { id: leadId },
        data: { columnId: dto.toColumnId, position: clamped },
      });

      // renumber target column
      for (let i = 0; i < reordered.length; i++) {
        await tx.lead.update({
          where: { id: reordered[i] },
          data: { position: i },
        });
      }

      // if moved across columns, compact source column
      if (!sameColumn) {
        const sourceLeads = await tx.lead.findMany({
          where: { columnId: fromColumnId },
          orderBy: { position: 'asc' },
          select: { id: true },
        });
        for (let i = 0; i < sourceLeads.length; i++) {
          await tx.lead.update({
            where: { id: sourceLeads[i].id },
            data: { position: i },
          });
        }
      }

      await tx.leadMovement.create({
        data: {
          workspaceId,
          leadId,
          fromColumnId: sameColumn ? null : fromColumnId,
          toColumnId: dto.toColumnId,
          movedById: userId,
        },
      });

      const fresh = await tx.lead.findUnique({
        where: { id: leadId },
        include: {
          contact: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
      });

      this.ws.emitToWorkspace(workspaceId, WS_EVENTS.LEAD_MOVED, {
        leadId,
        fromColumnId: sameColumn ? null : fromColumnId,
        toColumnId: dto.toColumnId,
        toPosition: clamped,
        lead: fresh,
      });

      this.events.emit(AUTOMATION_EVENT, {
        type: 'lead.moved',
        workspaceId,
        leadId,
        fromColumnId: sameColumn ? null : fromColumnId,
        toColumnId: dto.toColumnId,
        contactId: fresh?.contactId ?? null,
      });

      return fresh;
    });
  }

  // ============ helpers ============

  private async assertBoard(workspaceId: string, boardId: string) {
    const board = await this.prisma.kanbanBoard.findFirst({
      where: { id: boardId, workspaceId },
      select: { id: true },
    });
    if (!board) throw new ForbiddenException('Board não pertence ao workspace');
  }

  private async assertLead(workspaceId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException('Lead não encontrado');
  }
}
