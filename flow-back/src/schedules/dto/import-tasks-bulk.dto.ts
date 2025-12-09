import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ImportTaskRowDto } from './import-task-row.dto';

/**
 * DTO para importação em massa de tarefas
 */
export class ImportTasksBulkDto {
  @IsNumber()
  scheduleId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTaskRowDto)
  tasks: ImportTaskRowDto[];
}
