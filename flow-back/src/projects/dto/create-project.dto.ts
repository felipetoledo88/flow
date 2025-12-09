import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProjectStatus,
  ProjectHealth,
  ProjectPriority,
} from '../entities/project.entity';

export class CreateProjectDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus, {
    message: 'Status deve ser active, completed, paused ou cancelled',
  })
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectHealth, {
    message: 'Health deve ser healthy, warning ou critical',
  })
  health?: ProjectHealth;

  @IsOptional()
  @IsEnum(ProjectPriority, {
    message: 'Priority deve ser low, medium, high ou urgent',
  })
  priority?: ProjectPriority;

  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  endDate?: string;

  // Configurações adicionais
  @IsOptional()
  settings?: Record<string, any>;

  // Relacionamentos
  @IsOptional()
  @IsNumber({}, { message: 'ID da equipe deve ser um número válido' })
  teamId?: number;

  @IsOptional()
  @IsNumber({}, { message: 'ID do manager deve ser um número válido' })
  manager?: number;

  // Clientes removidos da criação - devem ser vinculados após via edição
}
