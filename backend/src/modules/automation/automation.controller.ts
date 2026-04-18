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
  CurrentWorkspace,
  type WorkspaceContext,
} from '../auth/decorators/current-workspace.decorator';

import { AutomationService } from './automation.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
} from './dto/automation.dto';

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('automations')
export class AutomationController {
  constructor(private readonly svc: AutomationService) {}

  @Get()
  list(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.svc.list(ws.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.svc.create(ws.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentWorkspace() ws: WorkspaceContext,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.svc.update(ws.id, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@CurrentWorkspace() ws: WorkspaceContext, @Param('id') id: string) {
    return this.svc.remove(ws.id, id);
  }
}
