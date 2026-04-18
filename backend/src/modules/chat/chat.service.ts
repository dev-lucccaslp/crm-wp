import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(workspaceId: string) {
    return this.prisma.conversation.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        contact: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        instance: { select: { id: true, name: true, status: true } },
      },
      take: 200,
    });
  }

  async listMessages(workspaceId: string, conversationId: string, before?: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, workspaceId },
      select: { id: true },
    });
    if (!conv) throw new NotFoundException('Conversa não encontrada');

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    return messages.reverse();
  }

  async markRead(workspaceId: string, conversationId: string) {
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, workspaceId },
      data: { unreadCount: 0 },
    });
    return { success: true };
  }
}
