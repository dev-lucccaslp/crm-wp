import { IsEnum } from 'class-validator';
import { PlanId } from '@prisma/client';

export class CreateCheckoutDto {
  @IsEnum(PlanId)
  planId!: PlanId;
}
