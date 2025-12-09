export type UserRole = 'admin' | 'user' | 'manager' | 'techlead' | 'client' | 'qa';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Project {
  id: number;
  name: string;
  description?: string;
  relation?: 'director' | 'team_member' | 'client';
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  avatar?: string;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  supervisorId?: number;
  supervisor?: {
    id: number;
    name: string;
    email: string;
  } | null;
  clientProjects?: Project[];
  projects?: Project[];
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus; // Status do usuário
  phone?: string;
  projectIds?: string[]; // Para vincular clientes a projetos
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  role?: UserRole;
  projectIds?: string[]; // Para atualizar vinculação de projetos
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface UserResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const USER_ROLES = {
  admin: 'Administrador',
  manager: 'Diretor',
  techlead: 'Tech Lead',
  user: 'Desenvolvedor',
  client: 'Cliente',
  qa: 'QA'
} as const;

export const USER_STATUSES = {
  active: 'Ativo',
  inactive: 'Inativo',
  pending: 'Pendente',
  suspended: 'Suspenso'
} as const;