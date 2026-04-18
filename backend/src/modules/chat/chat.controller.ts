import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import {
  CurrentWorkspace,
  type WorkspaceContext,
} from '../auth/decorators/current-workspace.decorator';

import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Get('conversations')
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.svc.listConversations(ws.id);
  }

  @Get('conversations/:id/messages')
  messages(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    return this.svc.listMessages(ws.id, id, before);
  }

  @Post('conversations/:id/read')
  markRead(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.svc.markRead(ws.id, id);
  }
}
