import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

import { PrismaService } from '../prisma/prisma.service';

export const WS_EVENTS = {
  LEAD_MOVED: 'lead.moved',
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_DELETED: 'lead.deleted',
  COLUMN_CHANGED: 'column.changed',
} as const;

@Injectable()
export class WsGateway implements OnModuleInit {
  private readonly logger = new Logger(WsGateway.name);
  private server: Server | null = null;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // server is attached externally in main.ts via attachServer()
  }

  attachServer(server: Server) {
    this.server = server;
    server.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ??
          (socket.handshake.headers.authorization as string | undefined)?.replace(
            /^Bearer\s+/i,
            '',
          );
        const workspaceId = socket.handshake.auth?.workspaceId as string | undefined;
        if (!token || !workspaceId) return next(new Error('unauthorized'));

        const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
        const membership = await this.prisma.membership.findUnique({
          where: {
            userId_workspaceId: { userId: payload.sub, workspaceId },
          },
        });
        if (!membership) return next(new Error('forbidden'));

        socket.data.userId = payload.sub;
        socket.data.workspaceId = workspaceId;
        next();
      } catch {
        next(new Error('unauthorized'));
      }
    });

    server.on('connection', (socket: Socket) => {
      const workspaceId = socket.data.workspaceId as string;
      socket.join(`workspace:${workspaceId}`);
      this.logger.debug(`socket connected ws=${workspaceId} user=${socket.data.userId}`);
    });
  }

  emitToWorkspace(workspaceId: string, event: string, payload: unknown) {
    this.server?.to(`workspace:${workspaceId}`).emit(event, payload);
  }
}
