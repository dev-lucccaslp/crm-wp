import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { DeletionRequestService } from './deletion-request.service';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, DeletionRequestService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
