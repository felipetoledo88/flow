import { api } from './index';

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