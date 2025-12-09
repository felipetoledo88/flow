import { IsArray, IsNumber, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StatusOrderDto {
  @IsNumber()
  @IsNotEmpty()
  statusId: number;

  @IsNumber()
  @IsNotEmpty()
  newOrder: number;
}

export class ReorderStatusDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatusOrderDto)
  reorderData: StatusOrderDto[];
}
