import {
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateTeamMemberDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  @Min(0)
  @Max(24)
  dailyWorkHours: number;

  @IsArray()
  @IsNumber({}, { each: true })
  workDays: number[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
