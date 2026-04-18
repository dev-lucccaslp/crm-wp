import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { WsGateway, WS_EVENTS } from '../../infra/websocket/ws.gateway';
import { EvolutionApiClient } from '../whatsapp/evolution-api.client';
import { MessageMediaType } from '@prisma/client';

import type {
  AutomationAction,
  AutomationEventPayload,
  AutomationTrigger,
} from './types';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
} from './dto/automation.dto';

export const AUTOMATION_EVENT = 'automation.trigger';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: WsGateway,
    private readonly evo: EvolutionApiClient,
  ) {}

  // ============ CRUD ============

  list(workspaceId: string) {
    return this.prisma.automationRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(workspaceId: string, dto: CreateAutomationDto) {
    return this.prisma.automationRule.create({
      data: {
        workspaceId,
        name: dto.name,
        enabled: dto.enabled ?? true,
        trigger: dto.trigger as any,
        actions: dto.actions as any,
      },
    });
  }

  async update(workspaceId: string, id: string, dto: UpdateAutomationDto) {
    await this.assert(workspaceId, id);
    return this.prisma.automationRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.trigger !== undefined ? { trigger: dto.trigger as any } : {}),
        ...(dto.actions !== undefined ? { actions: dto.actions as any } : {}),
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    await this.assert(workspaceId, id);
    await this.prisma.automationRule.delete({ where: { id } });
    return { success: true };
  }

  private async assert(workspaceId: string, id: string) {
    const found = await this.prisma.automationRule.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Regra não encontrada');
  }

  // ============ execução ============

  @OnEvent(AUTOMATION_EVENT, { async: true, promisify: true })
  async onEvent(payload: AutomationEventPayload) {
    try {
      const rules = await this.prisma.automationRule.findMany({
        where: { workspaceId: payload.workspaceId, enabled: true },
      });
      for (const rule of rules) {
        const trigger = rule.trigger as unknown as AutomationTrigger;
        if (!this.matches(trigger, payload)) continue;
        const actions = rule.actions as unknown as AutomationAction[];
        for (const action of actions ?? []) {
          await this.runAction(action, payload, rule.id, rule.name);
        }
      }
    } catch (err) {
      this.logger.error(`Erro processando automações: ${(err as Error).message}`);
    }
  }

  private matches(trigger: AutomationTrigger, p: AutomationEventPayload): boolean {
    if (trigger.type !== p.type) return false;
    if (trigger.type === 'lead.created' && p.type === 'lead.created') {
      return !trigger.columnId || trigger.columnId === p.columnId;
    }
    if (trigger.type === 'lead.moved' && p.type === 'lead.moved') {
      if (trigger.toColumnId && trigger.toColumnId !== p.toColumnId) return false;
      if (trigger.fromColumnId && trigger.fromColumnId !== p.fromColumnId) return false;
      return true;
    }
    if (trigger.type === 'message.received' && p.type === 'message.received') {
      if (!trigger.contains) return true;
      return p.content.toLowerCase().includes(trigger.contains.toLowerCase());
    }
    return false;
  }

  private async runAction(
    action: AutomationAction,
    p: AutomationEventPayload,
    ruleId: string,
    ruleName: string,
  ) {
    this.logger.log(`[${ruleName}] executando ${action.type}`);
    try {
      if (action.type === 'send_message') {
        await this.actionSendMessage(p, action.text);
      } else if (action.type === 'move_to_column') {
        await this.actionMoveToColumn(p, action.columnId);
      } else if (action.type === 'add_tag') {
        await this.actionAddTag(p, action.tag);
      }
    } catch (err) {
      this.logger.error(
        `[${ruleName}][${ruleId}] falha em ${action.type}: ${(err as Error).message}`,
      );
    }
  }

  private async actionSendMessage(p: AutomationEventPayload, text: string) {
    let conversationId: string | null = null;
    if (p.type === 'message.received') {
      conversationId = p.conversationId;
    } else if (p.contactId) {
      const conv = await this.prisma.conversation.findFirst({
        where: { workspaceId: p.workspaceId, contactId: p.contactId },
        orderBy: { lastMessageAt: 'desc' },
        select: { id: true, instance: { select: { evolutionInstance: true } }, contact: { select: { phone: true } } },
      });
      if (!conv) return;
      conversationId = conv.id;
    }
    if (!conversationId) return;

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        instance: { select: { evolutionInstance: true, status: true } },
        contact: { select: { phone: true } },
      },
    });
    if (!conv || conv.instance.status !== 'CONNECTED') return;

    const msg = await this.prisma.message.create({
      data: {
        workspaceId: p.workspaceId,
        conversationId,
        direction: 'OUTBOUND',
        status: 'PENDING',
        content: text,
        mediaType: MessageMediaType.NONE,
      },
    });

    try {
      const res = await this.evo.sendText({
        instanceName: conv.instance.evolutionInstance,
        number: conv.contact.phone,
        text,
      });
      await this.prisma.message.update({
        where: { id: msg.id },
        data: {
          status: 'SENT',
          externalId: res?.key?.id ?? null,
        },
      });
    } catch (err) {
      await this.prisma.message.update({
        where: { id: msg.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    const fresh = await this.prisma.message.findUnique({ where: { id: msg.id } });
    this.ws.emitToWorkspace(p.workspaceId, WS_EVENTS.MESSAGE_NEW, fresh);
  }

  private async actionMoveToColumn(p: AutomationEventPayload, columnId: string) {
    const leadId =
      p.type === 'message.received' ? p.leadId : p.type === 'lead.created' ? p.leadId : p.leadId;
    if (!leadId) return;

    const column = await this.prisma.kanbanColumn.findFirst({
      where: { id: columnId, workspaceId: p.workspaceId },
    });
    if (!column) return;

    const max = await this.prisma.lead.aggregate({
      where: { columnId },
      _max: { position: true },
    });

    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        columnId,
        boardId: column.boardId,
        position: (max._max.position ?? -1) + 1,
      },
    });

    await this.prisma.leadMovement.create({
      data: {
        workspaceId: p.workspaceId,
        leadId,
        toColumnId: columnId,
      },
    });

    this.ws.emitToWorkspace(p.workspaceId, WS_EVENTS.LEAD_UPDATED, lead);
  }

  private async actionAddTag(p: AutomationEventPayload, tag: string) {
    const leadId =
      p.type === 'message.received' ? p.leadId : p.type === 'lead.created' ? p.leadId : p.leadId;
    if (!leadId) return;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, workspaceId: p.workspaceId },
    });
    if (!lead) return;
    if (lead.tags.includes(tag)) return;

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { tags: { set: [...lead.tags, tag] } },
    });
    this.ws.emitToWorkspace(p.workspaceId, WS_EVENTS.LEAD_UPDATED, updated);
  }
}
