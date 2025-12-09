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

export class ProjectTasksService {
  static async createTask(projectId: string, taskData: any) {
    const response = await api.post(`/projects/${projectId}/tasks`, taskData);
    return response.data;
  }

  static async getTasksByProject(projectId: string) {
    const response = await api.get(`/projects/${projectId}/tasks`);
    return response.data;
  }

  static async updateTask(taskId: number, taskData: any) {
    // Encontrar o projectId da tarefa - por enquanto, usaremos uma abordagem simples
    // A rota será atualizada para ser mais genérica
    const response = await api.patch(`/tasks/${taskId}`, taskData);
    return response.data;
  }

  static async deleteTask(taskId: number) {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  }

  static async updateTaskHours(taskId: number, hoursData: any) {
    const response = await api.patch(`/tasks/${taskId}/hours`, hoursData);
    return response.data;
  }

  static async updateTaskBacklogStatus(taskId: number, isBacklog: boolean) {
    const response = await api.patch(`/tasks/${taskId}/backlog`, { isBacklog });
    return response.data;
  }

  static async updateTaskSprint(taskId: number, sprintId: number | null) {
    const response = await api.patch(`/tasks/${taskId}/sprint`, { sprintId });
    return response.data;
  }

  static async reorderTasks(projectId: string, reorderData: any) {
    const response = await api.patch(`/projects/${projectId}/tasks/reorder`, reorderData);
    return response.data;
  }
}

export default ProjectTasksService;