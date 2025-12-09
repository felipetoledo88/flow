import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || '';

      if (errorMessage === 'Invalid credentials' ||
          errorMessage.includes('validation') ||
          errorMessage.includes('Unauthorized')) {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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