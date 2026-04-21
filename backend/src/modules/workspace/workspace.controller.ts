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
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AllowInactiveSub } from '../billing/subscription-active.guard';

@AllowInactiveSub()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaces: WorkspaceService) {}

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
}
