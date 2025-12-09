export interface User {
  id: number;
  name: string;
  email: string;
}

export interface TeamMember {
  id: number;
  userId: number;
  user: User;
  dailyWorkHours: number;
  workDays: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  director: User;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamMemberDto {
  userId: number;
  dailyWorkHours: number;
  workDays: number[];
  isActive?: boolean;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
  isActive?: boolean;
  director: number;
  members?: CreateTeamMemberDto[];
}

export type UpdateTeamDto = Partial<CreateTeamDto>
export type UpdateTeamMemberDto = Partial<CreateTeamMemberDto>

export const WEEK_DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];
