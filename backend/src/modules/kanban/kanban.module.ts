import { Module } from '@nestjs/common';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [KanbanController],
  providers: [KanbanService],
})
export class KanbanModule {}
