import {
  IsOptional,
  IsString,
  MinLength,
  IsEmail,
  IsEnum,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email deve ser um email válido' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Role deve ser admin, user, manager ou client' })
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, {
    message: 'Status deve ser active, inactive, pending ou suspended',
  })
  status?: UserStatus;

  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Avatar deve ser uma string' })
  avatar?: string;

  @IsOptional()
  @IsString({ message: 'Token de verificação deve ser uma string' })
  emailVerificationToken?: string;

  @IsOptional()
  @IsString({ message: 'Token de reset de senha deve ser uma string' })
  passwordResetToken?: string;

  @IsOptional()
  @IsArray({ message: 'Project IDs deve ser um array' })
  @Type(() => Number)
  @IsNumber({}, { each: true, message: 'Cada project ID deve ser um número' })
  projectIds?: number[];
}
