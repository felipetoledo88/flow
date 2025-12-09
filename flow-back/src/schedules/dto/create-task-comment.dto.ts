import { IsString, IsOptional } from 'class-validator';

export class CreateTaskCommentDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  fileSize?: number;
}
