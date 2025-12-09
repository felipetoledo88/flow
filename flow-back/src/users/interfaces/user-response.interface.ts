export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
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
  clientProjects?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    description?: string;
    relation?: 'director' | 'team_member' | 'client';
  }>;
}

export interface PaginatedUsersResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  avatar?: string;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
