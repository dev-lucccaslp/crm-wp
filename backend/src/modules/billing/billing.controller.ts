import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../auth/guards/workspace.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  CurrentWorkspace,
  type WorkspaceContext,
} from '../auth/decorators/current-workspace.decorator';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator';

import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto';
import { AllowInactiveSub } from './subscription-active.guard';

@AllowInactiveSub()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  @Public()
  @Get('plans')
  plans() {
    return this.svc.listPlans();
  }

  @Get()
  current(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.svc.getSubscription(ws.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('checkout')
  checkout(
    @CurrentWorkspace() ws: WorkspaceContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.svc.createCheckout(ws.id, user.email, dto.planId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('portal')
  portal(@CurrentWorkspace() ws: WorkspaceContext) {
    return this.svc.createPortal(ws.id);
  }
}
