import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import {
  CurrentWorkspace,
  type WorkspaceContext,
} from '../auth/decorators/current-workspace.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';

import { KanbanService } from './kanban.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';
import {
  CreateColumnDto,
  ReorderColumnsDto,
  UpdateColumnDto,
} from './dto/column.dto';
import { CreateLeadDto, MoveLeadDto, UpdateLeadDto } from './dto/lead.dto';

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('kanban')
export class KanbanController {
  constructor(private readonly svc: KanbanService) {}

  // boards
  @Get('boards')
  listBoards(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.svc.listBoards(ws.id);
  }

  @Post('boards')
  createBoard(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: CreateBoardDto) {
    return this.svc.createBoard(ws.id, dto);
  }

  @Get('boards/:boardId')
  getBoard(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('boardId') boardId: string,
  ) {
    return this.svc.getBoardFull(ws.id, boardId);
  }

  @Patch('boards/:boardId')
  updateBoard(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.svc.updateBoard(ws.id, boardId, dto);
  }

  @Delete('boards/:boardId')
  deleteBoard(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('boardId') boardId: string,
  ) {
    return this.svc.deleteBoard(ws.id, boardId);
  }

  // columns
  @Post('boards/:boardId/columns')
  createColumn(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.svc.createColumn(ws.id, boardId, dto);
  }

  @Patch('boards/:boardId/columns/:columnId')
  updateColumn(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.svc.updateColumn(ws.id, boardId, columnId, dto);
  }

  @Delete('boards/:boardId/columns/:columnId')
  deleteColumn(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
  ) {
    return this.svc.deleteColumn(ws.id, boardId, columnId);
  }

  @Patch('boards/:boardId/columns/reorder')
  reorderColumns(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('boardId') boardId: string,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.svc.reorderColumns(ws.id, boardId, dto);
  }

  // leads
  @Post('leads')
  createLead(@CurrentWorkspace() ws: WorkspaceContext, @Body() dto: CreateLeadDto) {
    return this.svc.createLead(ws.id, dto);
  }

  @Get('leads/:leadId')
  getLead(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('leadId') leadId: string,
  ) {
    return this.svc.getLead(ws.id, leadId);
  }

  @Patch('leads/:leadId')
  updateLead(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.svc.updateLead(ws.id, leadId, dto);
  }

  @Delete('leads/:leadId')
  deleteLead(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('leadId') leadId: string,
  ) {
    return this.svc.deleteLead(ws.id, leadId);
  }

  @Post('leads/:leadId/move')
  moveLead(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @Param('leadId') leadId: string,
    @Body() dto: MoveLeadDto,
  ) {
    return this.svc.moveLead(ws.id, user.id, leadId, dto);
  }
}
