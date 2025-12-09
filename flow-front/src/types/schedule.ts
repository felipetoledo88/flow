import { User } from './team';
import { Team } from './team';
import { Sprint } from '@/services/api/sprints.service';

export enum ScheduleStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskStatusCode {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
}

export interface TaskStatusEntity {
  id: number;
  code: string;
  name: string;
  order: number;
  projectId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: number;
  taskId: number;
  userId: string;
  user: User;
  text: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  uploadedById: string;
  uploadedBy: User;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish',
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  director?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskDependency {
  id: number;
  taskId: number;
  dependsOnId: number;
  dependsOn?: Task;
  type: DependencyType;
  lagDays: number;
  createdAt: string;
}

export interface Task {
  id: number;
  scheduleId: number;
  title: string;
  description?: string;
  assigneeId: number;
  assignee: User;
  startDate: string;
  endDate: string;
  estimatedHours: number;
  actualHours: number;
  sprint?: Sprint; 
  sprintId?: number; 
  status: TaskStatusEntity;
  statusId: number;
  order: number;
  isBacklog?: boolean;
  dependencies: TaskDependency[];
  dependents: TaskDependency[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  project: Project;
  teamId: number;
  team: Team;
  status: ScheduleStatus;
  startDate?: string;
  expectedEndDate?: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  assigneeId: number;
  estimatedHours: number;
  actualHours?: number;
  sprint?: Sprint; 
  sprintId?: number; 
  statusId?: number;
  order?: number;
  isBacklog?: boolean;
}

export interface CreateScheduleDto {
  name: string;
  description?: string;
  projectId?: number;
  teamId?: number;
  status?: ScheduleStatus;
  startDate?: string;
  expectedEndDate?: string;
  tasks?: CreateTaskDto[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateTaskDto extends Partial<CreateTaskDto> {}

export interface UpdateTaskHoursDto {
  actualHours: number;
  comment?: string;
  reason?: string;
}

export interface TaskHoursHistory {
  id: number;
  taskId: number;
  userId: number;
  user: User;
  previousHours: number;
  newHours: number;
  hoursChanged: number;
  comment?: string;
  reason?: string;
  createdAt: string;
}

export interface CreateTaskDependencyDto {
  taskId: number;
  dependsOnId: number;
  type?: DependencyType;
  lagDays?: number;
}

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  [ScheduleStatus.PLANNING]: 'Planejamento',
  [ScheduleStatus.IN_PROGRESS]: 'Em Andamento',
  [ScheduleStatus.COMPLETED]: 'Concluído',
  [ScheduleStatus.CANCELLED]: 'Cancelado',
};

export const TASK_STATUS_LABELS: Record<TaskStatusCode, string> = {
  [TaskStatusCode.TODO]: 'A Fazer',
  [TaskStatusCode.IN_PROGRESS]: 'Em Andamento',
  [TaskStatusCode.BLOCKED]: 'Bloqueado',
  [TaskStatusCode.COMPLETED]: 'Concluído',
};

export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  [DependencyType.FINISH_TO_START]: 'Término-Início',
  [DependencyType.START_TO_START]: 'Início-Início',
  [DependencyType.FINISH_TO_FINISH]: 'Término-Término',
  [DependencyType.START_TO_FINISH]: 'Início-Término',
};
