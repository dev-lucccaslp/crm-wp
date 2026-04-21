import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { DeletionRequestService } from './deletion-request.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, DeletionRequestService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
