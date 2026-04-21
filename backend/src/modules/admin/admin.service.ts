import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaces() {
    const rows = await this.prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true } },
        _count: {
          select: {
            memberships: true,
            whatsappInstances: true,
            leads: true,
            conversations: true,
          },
        },
      },
    });
    return rows.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      createdAt: w.createdAt,
      plan: w.subscription?.plan ?? 'TRIAL',
      status: w.subscription?.status ?? 'TRIAL',
      members: w._count.memberships,
      instances: w._count.whatsappInstances,
      leads: w._count.leads,
      conversations: w._count.conversations,
    }));
  }

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            workspace: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async metrics() {
    const now = Date.now();
    const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalWorkspaces,
      totalUsers,
      totalLeads,
      leadsLast30,
      leadsLast7,
      totalMessages,
      inboundLast30,
      outboundLast30,
    ] = await Promise.all([
      this.prisma.workspace.count(),
      this.prisma.user.count(),
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { createdAt: { gte: since30 } } }),
      this.prisma.lead.count({ where: { createdAt: { gte: since7 } } }),
      this.prisma.message.count(),
      this.prisma.message.count({
        where: { direction: 'INBOUND', createdAt: { gte: since30 } },
      }),
      this.prisma.message.count({
        where: { direction: 'OUTBOUND', createdAt: { gte: since30 } },
      }),
    ]);

    // avg response time: 1ª outbound depois de cada inbound em cada conversation (últimos 30d)
    const convos = await this.prisma.conversation.findMany({
      where: { updatedAt: { gte: since30 } },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { direction: true, createdAt: true },
        },
      },
      take: 500,
    });
    const deltas: number[] = [];
    for (const c of convos) {
      let lastInbound: Date | null = null;
      for (const m of c.messages) {
        if (m.direction === 'INBOUND') lastInbound = m.createdAt;
        else if (m.direction === 'OUTBOUND' && lastInbound) {
          deltas.push(m.createdAt.getTime() - lastInbound.getTime());
          lastInbound = null;
        }
      }
    }
    const avgResponseMs = deltas.length
      ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
      : 0;

    // conversion: leads cuja coluna foi marcada como "WON"/"GANHO" (heurística via nome)
    const wonLeads = await this.prisma.lead.count({
      where: {
        createdAt: { gte: since30 },
        column: { name: { contains: 'ganho', mode: 'insensitive' } },
      },
    });
    const conversionRate = leadsLast30 > 0 ? wonLeads / leadsLast30 : 0;

    return {
      totals: {
        workspaces: totalWorkspaces,
        users: totalUsers,
        leads: totalLeads,
        messages: totalMessages,
      },
      leads: { last30: leadsLast30, last7: leadsLast7, won30: wonLeads },
      messages: { inbound30: inboundLast30, outbound30: outboundLast30 },
      avgResponseMs,
      conversionRate,
    };
  }

  listAuditLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      include: {
        user: { select: { id: true, name: true, email: true } },
        workspace: { select: { id: true, name: true } },
      },
    });
  }
}
