import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentWorkspace,
  type WorkspaceContext,
} from '../auth/decorators/current-workspace.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';

import { WhatsappService } from './whatsapp.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { SendMessageDto } from './dto/send-message.dto';

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly svc: WhatsappService) {}

  @Get('instances')
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.svc.listInstances(ws.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('instances')
  create(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: CreateInstanceDto) {
    return this.svc.createInstance(ws.id, dto);
  }

  @Get('instances/:id/qr')
  qr(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.svc.getQr(ws.id, id);
  }

  @Get('instances/:id/status')
  status(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.svc.getStatus(ws.id, id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete('instances/:id')
  remove(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.svc.deleteInstance(ws.id, id);
  }

  @Post('messages')
  send(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.svc.sendText(ws.id, user.id, dto.conversationId, dto.text);
  }
}
