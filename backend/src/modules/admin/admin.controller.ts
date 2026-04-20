import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('workspaces')
  workspaces() {
    return this.svc.listWorkspaces();
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
