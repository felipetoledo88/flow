import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

/**
 * DTO que representa uma linha do arquivo de importação (CSV/Excel)
 */
export class ImportTaskRowDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  order: number;


  @IsString()
  @IsOptional()
  assignee_email?: string;

  @IsNumber()
  @IsOptional()
  assignee_id?: number;

  @IsNumber()
  @IsOptional()
  sprint_id?: number;

  @IsBoolean()
  @IsOptional()
  isBacklog?: boolean;

  @IsNumber()
  @Min(0)
  estimatedHours: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  actualHours?: number;

  @IsNumber()
  @IsOptional()
  status_id?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
