import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Configuração base do axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
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

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Só faz logout se for realmente um erro de autenticação
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || '';
      
      // Não faz logout para erros específicos
      if (errorMessage === 'Invalid credentials' || 
          errorMessage.includes('validation') ||
          errorMessage.includes('Unauthorized')) {
        return Promise.reject(error);
      }
      
      // Para outros erros 401, faz logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  health: 'healthy' | 'warning' | 'critical';
  startDate?: string;
  endDate?: string;
  clients?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  team?: {
    id: number;
    name: string;
    director: {
      id: number;
      name: string;
      email: string;
    };
    members?: Array<{
      id: number;
      user: {
        id: number;
        name: string;
        email: string;
      };
    }>;
  };
  assignedTo?: string[]; // Adicionado para corrigir erro
  directorId?: string; // Adicionado para compatibilidade
  clientId?: string; // Adicionado para compatibilidade
  key?: string; // Adicionado para compatibilidade
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  health?: 'healthy' | 'warning' | 'critical';
  startDate?: string;
  endDate?: string;
  teamId?: number;
  // Clientes removidos - devem ser vinculados após criação via edição
  clients?: never;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  teamId?: number; // ID da equipe como number para o backend
  actualExpectedEndDate?: string; // Data de fim prevista atual
  clientIds?: string[]; // IDs dos clientes a serem vinculados
}

export interface ProjectQuery {
  search?: string;
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  health?: 'healthy' | 'warning' | 'critical';
  director?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  paused: number;
  cancelled: number;
  healthy: number;
  warning: number;
  critical: number;
  averageProgress: number;
  averageVelocity: number;
}

export class ProjectsService {
  static async getProjects(query?: ProjectQuery): Promise<PaginatedProjectsResponse> {
    const response = await api.get<PaginatedProjectsResponse>('/projects', { params: query });
    return response.data;
  }

  static async getProject(id: string): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
  }

  static async createProject(data: CreateProjectData): Promise<{ message: string; project: Project }> {
    const response = await api.post<{ message: string; project: Project }>('/projects', data);
    return response.data;
  }

  static async updateProject(id: string, data: UpdateProjectData): Promise<{ message: string; project: Project }> {
    const response = await api.patch<{ message: string; project: Project }>(`/projects/${id}`, data);
    return response.data;
  }

  static async deleteProject(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/projects/${id}`);
    return response.data;
  }

  static async getProjectStats(): Promise<ProjectStats> {
    const response = await api.get<ProjectStats>('/projects/stats');
    return response.data;
  }

  static async changeProjectStatus(id: string, status: Project['status']): Promise<{ message: string; project: Project }> {
    const response = await api.patch<{ message: string; project: Project }>(`/projects/${id}/status`, { status });
    return response.data;
  }

  static async changeProjectHealth(id: string, health: Project['health']): Promise<{ message: string; project: Project }> {
    const response = await api.patch<{ message: string; project: Project }>(`/projects/${id}/health`, { health });
    return response.data;
  }

  static async getUserProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>('/users/available-projects');
    return response.data;
  }

  static async getProjectAsSchedule(id: string): Promise<any> {
    const response = await api.get(`/projects/${id}/schedule`);
    return response.data;
  }

}

export default ProjectsService;
