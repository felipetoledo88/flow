import { api } from './index';

export interface StatusSprint {
  id: number;
  name: 'Em andamento' | 'Pendente' | 'Concluído';
  createdAt: string;
  updatedAt: string;
}

export interface Sprint {
  id: number;
  name: string;
  expectDate?: string;
  expectEndDate?: string;
  startDate?: string;
  endDate?: string;
  projectId: number;
  statusSprintId?: number;
  project?: {
    id: number;
    name: string;
  };
  statusSprint?: StatusSprint;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintDto {
  name: string;
  expectDate?: string;
  expectEndDate?: string;
  projectId: number;
}

export interface UpdateSprintDto {
  name?: string;
  expectDate?: string;
  expectEndDate?: string;
  endDate?: string;
  projectId?: number;
  statusSprintId?: number;
}

export class SprintsService {
  static async createSprint(createSprintDto: CreateSprintDto): Promise<Sprint> {
    const response = await api.post('/sprints', createSprintDto);
    return response.data;
  }

  static async getSprints(projectId?: number): Promise<Sprint[]> {
    const params = projectId ? { projectId } : {};
    const response = await api.get('/sprints', { params });
    return response.data;
  }

  static async getSprint(id: number): Promise<Sprint> {
    const response = await api.get(`/sprints/${id}`);
    return response.data;
  }

  static async updateSprint(id: number, updateSprintDto: UpdateSprintDto): Promise<Sprint> {
    const response = await api.patch(`/sprints/${id}`, updateSprintDto);
    return response.data;
  }

  static async deleteSprint(id: number): Promise<void> {
    await api.delete(`/sprints/${id}`);
  }

  static async getStatusSprints(): Promise<StatusSprint[]> {
    const response = await api.get('/status-sprint');
    return response.data;
  }

  static async updateSprintStatus(sprintId: number, statusSprintId: number): Promise<Sprint> {
    const payload = { statusSprintId };
    const response = await api.patch(`/sprints/${sprintId}`, payload);
    return response.data;
  }

  static async getNextSprint(sprintId: number): Promise<Sprint | null> {
    try {
      const response = await api.get(`/sprints/${sprintId}/next-sprint`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  static async transferIncompleteTasksToNextSprint(sprintId: number): Promise<{
    transferredCount: number;
    nextSprintName: string;
    incompleteTasks: any[];
  }> {
    const response = await api.post(`/sprints/${sprintId}/transfer-incomplete-tasks`);
    return response.data;
  }
}