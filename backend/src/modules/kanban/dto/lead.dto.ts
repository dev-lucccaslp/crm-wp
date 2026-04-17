import {
  IsArray,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLeadDto {
  @IsString() boardId!: string;
  @IsString() columnId!: string;
  @IsString() @MinLength(1) title!: string;
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsNumberString() value?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @MinLength(1) title?: string;
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsNumberString() value?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class MoveLeadDto {
  @IsString() toColumnId!: string;
  @IsInt() @Min(0) toPosition!: number;
}
