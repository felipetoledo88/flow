import { IsNumber, Min, IsOptional, IsString, Allow } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTaskHoursDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualHours: number;

  @IsOptional()
  @IsString()
  @Allow()
  comment?: string;

  @IsOptional()
  @IsString()
  @Allow()
  reason?: string;
}
