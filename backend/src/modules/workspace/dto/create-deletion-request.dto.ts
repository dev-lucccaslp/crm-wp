import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeletionRequestType } from '@prisma/client';

export class CreateDeletionRequestDto {
  @IsEnum(DeletionRequestType)
  type!: DeletionRequestType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
