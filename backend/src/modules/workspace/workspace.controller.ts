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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import {
  CurrentWorkspace,
  type WorkspaceContext,
} from '../auth/decorators/current-workspace.decorator';

import { WorkspaceService } from './workspace.service';
import { DeletionRequestService } from './deletion-request.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreateDeletionRequestDto } from './dto/create-deletion-request.dto';
import { AllowInactiveSub } from '../billing/subscription-active.guard';

@AllowInactiveSub()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private readonly workspaces: WorkspaceService,
    private readonly deletions: DeletionRequestService,
  ) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.workspaces.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.id, dto);
  }

  @UseGuards(WorkspaceGuard)
  @Get('current/members')
  listMembers(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.workspaces.listMembers(ws.id);
  }

  @UseGuards(WorkspaceGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('current/members')
  invite(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspaces.inviteMember(ws.id, dto.email, dto.role);
  }

  @UseGuards(WorkspaceGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('current/members/:membershipId')
  updateRole(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.workspaces.updateMemberRole(ws.id, membershipId, dto.role);
  }

  @UseGuards(WorkspaceGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('current/members/:membershipId')
  remove(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('membershipId') membershipId: string,
  ) {
    return this.workspaces.removeMember(ws.id, membershipId);
  }

  // ───── Pedido de exclusão (OWNER-only, 7 dias de carência) ─────

  @UseGuards(WorkspaceGuard)
  @Get('current/deletion-requests')
  listDeletions(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.deletions.list(ws.id);
  }

  @UseGuards(WorkspaceGuard, RolesGuard)
  @Roles('OWNER')
  @Post('current/deletion-requests')
  requestDeletion(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDeletionRequestDto,
  ) {
    return this.deletions.request({
      workspaceId: ws.id,
      userId: user.id,
      type: dto.type,
      reason: dto.reason,
    });
  }

  @UseGuards(WorkspaceGuard, RolesGuard)
  @Roles('OWNER')
  @Delete('current/deletion-requests/:id')
  cancelDeletion(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.deletions.cancel(ws.id, user.id, id);
  }
}
