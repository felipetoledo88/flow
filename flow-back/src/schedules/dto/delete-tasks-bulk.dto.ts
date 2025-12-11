import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class DeleteTasksBulkDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Deve haver pelo menos uma tarefa para excluir' })
  @IsInt({ each: true, message: 'Todos os IDs devem ser números inteiros' })
  taskIds: number[];
}
