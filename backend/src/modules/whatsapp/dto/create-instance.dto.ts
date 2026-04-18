import { IsString, MinLength } from 'class-validator';

export class CreateInstanceDto {
  @IsString() @MinLength(2)
  name!: string;
}
