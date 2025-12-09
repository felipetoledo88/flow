import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  assigneeId?: number;

  @IsNumber()
  @Min(0)
  estimatedHours: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  actualHours?: number;

  @IsNumber()
  @IsOptional()
  sprintId?: number;

  @IsNumber()
  @IsOptional()
  statusId?: number;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isBacklog?: boolean;
}
