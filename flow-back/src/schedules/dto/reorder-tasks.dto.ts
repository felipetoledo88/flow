import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TaskOrderDto {
  @IsNumber()
  taskId: number;

  @IsNumber()
  newOrder: number;
}

export class ReorderTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskOrderDto)
  tasks: TaskOrderDto[];
}
