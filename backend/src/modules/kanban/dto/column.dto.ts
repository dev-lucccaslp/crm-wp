import {
  ArrayNotEmpty,
  IsArray,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateColumnDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsHexColor() color?: string;
}

export class UpdateColumnDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
}

export class ReorderColumnsDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  columnIds!: string[];
}
