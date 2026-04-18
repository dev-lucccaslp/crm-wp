import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

const AUTOMATION_EVENT = 'automation.trigger';
import {
  MessageDirection,
  MessageMediaType,
  MessageStatus,
  WhatsappStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { WsGateway, WS_EVENTS } from '../../infra/websocket/ws.gateway';
import { EvolutionApiClient } from './evolution-api.client';
import { CreateInstanceDto } from './dto/create-instance.dto';

type EvolutionEvent = {
  event?: string;
  instance?: string;
  data?: any;
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evo: EvolutionApiClient,
    private readonly ws: WsGateway,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  private webhookUrl(secret: string) {
    const base =
      this.config.get<string>('BACKEND_PUBLIC_URL') ??
      `http://localhost:${this.config.get<string>('BACKEND_PORT') ?? 3333}`;
    return `${base.replace(/\/+$/, '')}/api/webhooks/evolution/${secret}`;
  }

  // ============ instances ============

  async listInstances(workspaceId: string) {
    return this.prisma.whatsappInstance.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        evolutionInstance: true,
        phoneNumber: true,
        status: true,
        lastConnectedAt: true,
        createdAt: true,
      },
    });
  }

  async createInstance(workspaceId: string, dto: CreateInstanceDto) {
    const webhookSecret = randomBytes(24).toString('hex');
    const evolutionInstance = `ws-${workspaceId}-${randomBytes(4).toString('hex')}`;

    const instance = await this.prisma.whatsappInstance.create({
      data: {
        workspaceId,
        name: dto.name,
        evolutionInstance,
        webhookSecret,
        status: WhatsappStatus.CONNECTING,
      },
    });

    try {
      await this.evo.createInstance({
        instanceName: evolutionInstance,
        webhookUrl: this.webhookUrl(webhookSecret),
      });
    } catch (err) {
      await this.prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: { status: WhatsappStatus.FAILED },
      });
      throw err;
    }
    return instance;
  }

  async getQr(workspaceId: string, instanceId: string) {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: { id: instanceId, workspaceId },
    });
    if (!instance) throw new NotFoundException('Instância não encontrada');

    const res = await this.evo.getQrCode(instance.evolutionInstance);
    return { base64: res.base64 ?? null, code: res.code ?? null };
  }

  async getStatus(workspaceId: string, instanceId: string) {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: { id: instanceId, workspaceId },
    });
    if (!instance) throw new NotFoundException('Instância não encontrada');
    const res = await this.evo.getConnectionState(instance.evolutionInstance);
    return { state: res.instance?.state ?? instance.status, local: instance.status };
  }

  async deleteInstance(workspaceId: string, instanceId: string) {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: { id: instanceId, workspaceId },
    });
    if (!instance) throw new NotFoundException('Instância não encontrada');
    try {
      await this.evo.logout(instance.evolutionInstance);
    } catch {
      /* ignore */
    }
    try {
      await this.evo.deleteInstance(instance.evolutionInstance);
    } catch {
      /* ignore */
    }
    await this.prisma.whatsappInstance.delete({ where: { id: instance.id } });
    return { success: true };
  }

  // ============ send ============

  async sendText(workspaceId: string, userId: string, conversationId: string, text: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      include: { contact: true, instance: true },
    });
    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    if (conversation.instance.status !== WhatsappStatus.CONNECTED) {
      throw new BadRequestException('WhatsApp não está conectado');
    }

    const message = await this.prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.PENDING,
        content: text,
        metadata: { sentByUserId: userId },
      },
    });

    try {
      const res = await this.evo.sendText({
        instanceName: conversation.instance.evolutionInstance,
        number: conversation.contact.phone,
        text,
      });
      const updated = await this.prisma.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.SENT,
          sentAt: new Date(),
          externalId: res.key?.id ?? null,
        },
      });
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
      this.ws.emitToWorkspace(workspaceId, WS_EVENTS.MESSAGE_NEW, updated);
      return updated;
    } catch (err) {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: MessageStatus.FAILED },
      });
      throw err;
    }
  }

  // ============ webhook ============

  async handleWebhook(webhookSecret: string, payload: EvolutionEvent) {
    const instance = await this.prisma.whatsappInstance.findFirst({
      where: { webhookSecret },
      include: { workspace: true },
    });
    if (!instance) {
      this.logger.warn(`Webhook com secret inválido`);
      return { ignored: true };
    }

    const event = payload.event ?? '';

    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      await this.onConnectionUpdate(instance.id, payload.data);
    } else if (event === 'qrcode.updated' || event === 'QRCODE_UPDATED') {
      await this.onQrUpdate(instance.id, instance.workspaceId, payload.data);
    } else if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      await this.onMessageUpsert(instance.id, instance.workspaceId, payload.data);
    } else if (event === 'messages.update' || event === 'MESSAGES_UPDATE') {
      await this.onMessageUpdate(instance.workspaceId, payload.data);
    }
    return { ok: true };
  }

  private async onConnectionUpdate(instanceId: string, data: any) {
    const state = (data?.state ?? data?.connection ?? '').toLowerCase();
    let status: WhatsappStatus = WhatsappStatus.CONNECTING;
    if (state === 'open') status = WhatsappStatus.CONNECTED;
    else if (state === 'close' || state === 'closed') status = WhatsappStatus.DISCONNECTED;

    const instance = await this.prisma.whatsappInstance.update({
      where: { id: instanceId },
      data: {
        status,
        lastConnectedAt: status === WhatsappStatus.CONNECTED ? new Date() : undefined,
        phoneNumber: data?.wuid?.split('@')[0] ?? data?.phoneNumber ?? undefined,
      },
    });
    this.ws.emitToWorkspace(instance.workspaceId, WS_EVENTS.WHATSAPP_STATUS, {
      instanceId,
      status,
    });
  }

  private async onQrUpdate(instanceId: string, workspaceId: string, data: any) {
    const qr = data?.qrcode?.base64 ?? data?.base64 ?? null;
    await this.prisma.whatsappInstance.update({
      where: { id: instanceId },
      data: { qrCode: qr, status: WhatsappStatus.CONNECTING },
    });
    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.WHATSAPP_QR, { instanceId, base64: qr });
  }

  private async onMessageUpsert(instanceId: string, workspaceId: string, data: any) {
    // Evolution may deliver an array or a single object
    const list: any[] = Array.isArray(data) ? data : data?.messages ?? [data];

    for (const raw of list) {
      if (!raw?.key?.remoteJid) continue;
      const jid: string = raw.key.remoteJid;
      if (jid.endsWith('@g.us')) continue; // skip groups for now
      const phone = jid.split('@')[0];
      const fromMe: boolean = !!raw.key.fromMe;
      const pushName: string | undefined = raw.pushName;
      const externalId: string | undefined = raw.key.id;
      const timestamp = raw.messageTimestamp
        ? new Date(Number(raw.messageTimestamp) * 1000)
        : new Date();

      const { content, mediaType, mediaUrl, mediaMimeType } = extractMessageContent(
        raw.message ?? {},
      );

      const contact = await this.prisma.contact.upsert({
        where: { workspaceId_phone: { workspaceId, phone } },
        update: pushName ? { name: pushName } : {},
        create: { workspaceId, phone, name: pushName },
      });

      const conversation = await this.prisma.conversation.upsert({
        where: { instanceId_contactId: { instanceId, contactId: contact.id } },
        update: { lastMessageAt: timestamp },
        create: {
          workspaceId,
          instanceId,
          contactId: contact.id,
          lastMessageAt: timestamp,
        },
      });

      // avoid dupes
      if (externalId) {
        const exists = await this.prisma.message.findUnique({
          where: { externalId },
        });
        if (exists) continue;
      }

      const message = await this.prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          externalId,
          direction: fromMe ? MessageDirection.OUTBOUND : MessageDirection.INBOUND,
          status: fromMe ? MessageStatus.SENT : MessageStatus.DELIVERED,
          content,
          mediaType,
          mediaUrl,
          mediaMimeType,
          sentAt: fromMe ? timestamp : undefined,
          deliveredAt: fromMe ? undefined : timestamp,
        },
      });

      if (!fromMe) {
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { unreadCount: { increment: 1 } },
        });
        await this.autoCreateLead(workspaceId, contact.id, pushName ?? phone);

        const lead = await this.prisma.lead.findFirst({
          where: { workspaceId, contactId: contact.id },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        });
        this.events.emit(AUTOMATION_EVENT, {
          type: 'message.received',
          workspaceId,
          conversationId: conversation.id,
          contactId: contact.id,
          leadId: lead?.id ?? null,
          content: content ?? '',
        });
      }

      this.ws.emitToWorkspace(workspaceId, WS_EVENTS.MESSAGE_NEW, message);
      this.ws.emitToWorkspace(workspaceId, WS_EVENTS.CONVERSATION_UPSERT, {
        id: conversation.id,
        contactId: contact.id,
      });
    }
  }

  private async onMessageUpdate(workspaceId: string, data: any) {
    const list: any[] = Array.isArray(data) ? data : [data];
    for (const raw of list) {
      const externalId: string | undefined = raw?.key?.id;
      if (!externalId) continue;
      const statusNum: number | undefined = raw?.status ?? raw?.update?.status;
      const status = mapStatus(statusNum);
      if (!status) continue;
      const existing = await this.prisma.message.findUnique({ where: { externalId } });
      if (!existing || existing.workspaceId !== workspaceId) continue;

      const updated = await this.prisma.message.update({
        where: { externalId },
        data: {
          status,
          deliveredAt: status === MessageStatus.DELIVERED ? new Date() : existing.deliveredAt,
          readAt: status === MessageStatus.READ ? new Date() : existing.readAt,
        },
      });
      this.ws.emitToWorkspace(workspaceId, WS_EVENTS.MESSAGE_STATUS, {
        id: updated.id,
        status,
      });
    }
  }

  private async autoCreateLead(workspaceId: string, contactId: string, displayName: string) {
    // only if contact has no open lead
    const existing = await this.prisma.lead.findFirst({
      where: { workspaceId, contactId },
      select: { id: true },
    });
    if (existing) return;

    const board = await this.prisma.kanbanBoard.findFirst({
      where: { workspaceId, isDefault: true },
      include: { columns: { orderBy: { position: 'asc' }, take: 1 } },
    });
    if (!board || board.columns.length === 0) return;

    const column = board.columns[0];
    const max = await this.prisma.lead.aggregate({
      where: { columnId: column.id },
      _max: { position: true },
    });
    const lead = await this.prisma.lead.create({
      data: {
        workspaceId,
        boardId: board.id,
        columnId: column.id,
        contactId,
        title: `Novo contato — ${displayName}`,
        position: (max._max.position ?? -1) + 1,
        tags: ['auto'],
      },
      include: {
        contact: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    this.ws.emitToWorkspace(workspaceId, WS_EVENTS.LEAD_CREATED, lead);
  }
}

function extractMessageContent(msg: any): {
  content: string | null;
  mediaType: MessageMediaType;
  mediaUrl: string | null;
  mediaMimeType: string | null;
} {
  if (msg.conversation) {
    return { content: msg.conversation, mediaType: 'NONE', mediaUrl: null, mediaMimeType: null };
  }
  if (msg.extendedTextMessage?.text) {
    return {
      content: msg.extendedTextMessage.text,
      mediaType: 'NONE',
      mediaUrl: null,
      mediaMimeType: null,
    };
  }
  if (msg.imageMessage) {
    return {
      content: msg.imageMessage.caption ?? null,
      mediaType: 'IMAGE',
      mediaUrl: msg.imageMessage.url ?? null,
      mediaMimeType: msg.imageMessage.mimetype ?? 'image/jpeg',
    };
  }
  if (msg.videoMessage) {
    return {
      content: msg.videoMessage.caption ?? null,
      mediaType: 'VIDEO',
      mediaUrl: msg.videoMessage.url ?? null,
      mediaMimeType: msg.videoMessage.mimetype ?? 'video/mp4',
    };
  }
  if (msg.audioMessage) {
    return {
      content: null,
      mediaType: 'AUDIO',
      mediaUrl: msg.audioMessage.url ?? null,
      mediaMimeType: msg.audioMessage.mimetype ?? 'audio/ogg',
    };
  }
  if (msg.documentMessage) {
    return {
      content: msg.documentMessage.fileName ?? null,
      mediaType: 'DOCUMENT',
      mediaUrl: msg.documentMessage.url ?? null,
      mediaMimeType: msg.documentMessage.mimetype ?? null,
    };
  }
  if (msg.stickerMessage) {
    return {
      content: null,
      mediaType: 'STICKER',
      mediaUrl: msg.stickerMessage.url ?? null,
      mediaMimeType: msg.stickerMessage.mimetype ?? 'image/webp',
    };
  }
  return { content: null, mediaType: 'NONE', mediaUrl: null, mediaMimeType: null };
}

function mapStatus(n: number | undefined): MessageStatus | null {
  // Baileys numeric enum: 0 ERROR, 1 PENDING, 2 SENT/SERVER_ACK, 3 DELIVERED_ACK, 4 READ, 5 PLAYED
  switch (n) {
    case 0:
      return MessageStatus.FAILED;
    case 1:
      return MessageStatus.PENDING;
    case 2:
      return MessageStatus.SENT;
    case 3:
      return MessageStatus.DELIVERED;
    case 4:
    case 5:
      return MessageStatus.READ;
    default:
      return null;
  }
}
