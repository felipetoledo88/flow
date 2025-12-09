// DEPRECATED: Esta entidade não será mais usada.
// O cronograma agora utiliza apenas os dados da tabela 'projects'.
// Este arquivo existe apenas para compatibilidade temporária.

import { Task } from './task.entity';

export enum ScheduleStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Interface mínima para compatibilidade temporária
export interface Schedule {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  teamId?: number;
  status: ScheduleStatus;
  startDate?: Date;
  expectedEndDate?: Date;
  tasks?: Task[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

// Classe depreciada - não use em código novo
export class Schedule implements Schedule {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  teamId?: number;
  status: ScheduleStatus;
  startDate?: Date;
  expectedEndDate?: Date;
  tasks?: Task[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}
