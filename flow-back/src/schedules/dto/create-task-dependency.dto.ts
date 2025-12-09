import { IsNumber, IsEnum, IsOptional } from 'class-validator';
import { DependencyType } from '../entities/task-dependency.entity';

export class CreateTaskDependencyDto {
  @IsNumber()
  taskId: number;

  @IsNumber()
  dependsOnId: number;

  @IsEnum(DependencyType)
  @IsOptional()
  type?: DependencyType;

  @IsNumber()
  @IsOptional()
  lagDays?: number;
}
