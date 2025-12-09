import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTeamMemberDto } from './create-team-member.dto';

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  director: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTeamMemberDto)
  @IsOptional()
  members?: CreateTeamMemberDto[];
}
