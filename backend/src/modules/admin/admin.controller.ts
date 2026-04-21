import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';
import { AdminService } from './admin.service';
import { AllowInactiveSub } from '../billing/subscription-active.guard';

class BlockWorkspaceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@AllowInactiveSub()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('workspaces')
  workspaces() {
    return this.svc.listWorkspaces();
  }

  @Get('workspaces/:id')
  workspace(@Param('id') id: string) {
    return this.svc.getWorkspace(id);
  }

  @Post('workspaces/:id/block')
  block(@Param('id') id: string, @Body() dto: BlockWorkspaceDto) {
    return this.svc.blockWorkspace(id, dto.reason);
  }

  @Post('workspaces/:id/unblock')
  unblock(@Param('id') id: string) {
    return this.svc.unblockWorkspace(id);
  }

  @Delete('workspaces/:id')
  forceDelete(@Param('id') id: string) {
    return this.svc.forceDeleteWorkspace(id);
  }

  @Post('memberships/:id/block')
  blockMember(@Param('id') id: string) {
    return this.svc.blockMembership(id);
  }

  @Post('memberships/:id/unblock')
  unblockMember(@Param('id') id: string) {
    return this.svc.unblockMembership(id);
  }

  @Get('users')
  users() {
    return this.svc.listUsers();
  }

  @Get('metrics')
  metrics() {
    return this.svc.metrics();
  }

  @Get('audit-logs')
  audit(@Query('limit') limit?: string) {
    return this.svc.listAuditLogs(limit ? Number(limit) : 100);
  }
}
