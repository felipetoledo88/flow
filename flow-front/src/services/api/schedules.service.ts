import axios from 'axios';
import {
  Schedule,
  ScheduleTask,
  TaskDependency,
  TaskHoursHistory,
  TaskComment,
  CreateScheduleDto,
  UpdateScheduleDto,
  CreateScheduleTaskDto,
  UpdateScheduleTaskDto,
  UpdateTaskHoursDto,
  CreateTaskDependencyDto,
} from '../../types/schedule';

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

export class SchedulesService {
  // Schedule CRUD
  static async getSchedules(): Promise<Schedule[]> {
    const response = await api.get<Schedule[]>('/schedules');
    return response.data;
  }

  static async getSchedule(id: number): Promise<Schedule> {
    // Agora busca o projeto como schedule
    const response = await api.get<Schedule>(`/projects/${id}/schedule`);
    return response.data;
  }

  static async createSchedule(data: CreateScheduleDto): Promise<Schedule> {
    const response = await api.post<Schedule>('/schedules', data);
    return response.data;
  }

  static async updateSchedule(id: number, data: UpdateScheduleDto): Promise<Schedule> {
    const response = await api.patch<Schedule>(`/schedules/${id}`, data);
    return response.data;
  }

  static async deleteSchedule(id: number): Promise<void> {
    await api.delete(`/schedules/${id}`);
  }

  // Task CRUD
  static async getTasksBySchedule(scheduleId: number): Promise<ScheduleTask[]> {
    // Agora o scheduleId é na verdade um projectId
    const response = await api.get<ScheduleTask[]>(`/projects/${scheduleId}/tasks`);
    return response.data;
  }

  static async getTasksByProject(projectId: number): Promise<ScheduleTask[]> {
    const response = await api.get<ScheduleTask[]>(`/projects/${projectId}/tasks`);
    return response.data;
  }

  static async createTask(
    scheduleId: number,
    data: CreateScheduleTaskDto
  ): Promise<ScheduleTask> {
    // Agora o scheduleId é na verdade um projectId
    const response = await api.post<ScheduleTask>(
      `/projects/${scheduleId}/tasks`,
      data
    );
    return response.data;
  }

  static async updateTask(taskId: number, data: UpdateScheduleTaskDto): Promise<ScheduleTask> {
    const response = await api.patch<ScheduleTask>(`/tasks/${taskId}`, data);
    return response.data;
  }

  static async updateTaskHours(
    taskId: number,
    data: UpdateTaskHoursDto
  ): Promise<ScheduleTask> {
    const response = await api.patch<ScheduleTask>(
      `/tasks/${taskId}/hours`,
      data
    );
    return response.data;
  }

  static async getTaskHoursHistory(taskId: number): Promise<TaskHoursHistory[]> {
    const response = await api.get<TaskHoursHistory[]>(
      `tasks/${taskId}/hours/history`
    );
    return response.data;
  }

  static async updateTaskHoursHistory(
    historyId: number,
    data: { newHours: number; comment?: string }
  ): Promise<TaskHoursHistory> {
    const response = await api.patch<TaskHoursHistory>(
      `/schedules/tasks/hours/history/${historyId}`,
      data
    );
    return response.data;
  }

  static async deleteTaskHoursHistory(historyId: number): Promise<void> {
    await api.delete(`/schedules/tasks/hours/history/${historyId}`);
  }

  static async deleteTask(taskId: number): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  }

  static async updateTaskBacklogStatus(
    taskId: number,
    isBacklog: boolean
  ): Promise<ScheduleTask> {
    const response = await api.patch<ScheduleTask>(
      `/tasks/${taskId}/backlog`,
      { isBacklog }
    );
    return response.data;
  }

  static async updateTaskSprint(
    taskId: number,
    sprintId: number | null
  ): Promise<ScheduleTask> {
    const response = await api.patch<ScheduleTask>(
      `/tasks/${taskId}/sprint`,
      { sprintId }
    );
    return response.data;
  }

  // Dependencies
  static async createDependency(data: CreateTaskDependencyDto): Promise<TaskDependency> {
    const response = await api.post<TaskDependency>('/schedules/tasks/dependencies', data);
    return response.data;
  }

  static async deleteDependency(dependencyId: number): Promise<void> {
    await api.delete(`/schedules/tasks/dependencies/${dependencyId}`);
  }

  // Reorder tasks
  static async reorderTasks(
    scheduleId: number,
    tasks: { taskId: number; newOrder: number }[]
  ): Promise<ScheduleTask[]> {
    // Agora o scheduleId é na verdade um projectId
    const response = await api.patch<ScheduleTask[]>(
      `/projects/${scheduleId}/tasks/reorder`,
      { tasks }
    );
    return response.data;
  }

  // Get only tasks for a schedule (without full schedule data)
  static async getTasksOnly(scheduleId: number): Promise<ScheduleTask[]> {
    // Agora o scheduleId é na verdade um projectId
    const response = await api.get<ScheduleTask[]>(`/projects/${scheduleId}/tasks`);
    return response.data;
  }

  // Force recalculate a specific task and get updated data
  static async forceRecalculateTask(taskId: number): Promise<{ task: ScheduleTask }> {
    const response = await api.post<{ task: ScheduleTask }>(`/schedules/tasks/${taskId}/force-recalculate`);
    return response.data;
  }

  // Force recalculate all tasks of a schedule (used when project dates change)
  static async forceRecalculateSchedule(scheduleId: number): Promise<ScheduleTask[]> {
    const response = await api.post<ScheduleTask[]>(`/schedules/${scheduleId}/force-recalculate`);
    return response.data;
  }

  // Reorder tasks after sprint completion (completed tasks first)
  static async reorderTasksAfterSprintCompletion(sprintId: number): Promise<{ reorderedCount: number; details: any[] }> {
    const response = await api.post<{ reorderedCount: number; details: any[] }>(`/schedules/sprints/${sprintId}/reorder-after-completion`);
    return response.data;
  }


  // Import tasks in bulk from CSV/Excel file
  static async importTasks(
    projectId: number,
    file: File
  ): Promise<{ message: string; tasks: ScheduleTask[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ message: string; tasks: ScheduleTask[] }>(
      `/schedules/${projectId}/tasks/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  // Task Comments
  static async getTaskComments(taskId: number): Promise<TaskComment[]> {
    const response = await api.get<TaskComment[]>(`/tasks/${taskId}/comments`);
    return response.data;
  }

  static async createTaskComment(
    taskId: number,
    text: string
  ): Promise<TaskComment> {
    const response = await api.post<TaskComment>(
      `/tasks/${taskId}/comments`,
      { text }
    );
    return response.data;
  }

  static async createTaskCommentWithFile(
    taskId: number,
    file: File
  ): Promise<TaskComment> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<TaskComment>(
      `/tasks/${taskId}/comments/file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  static async deleteTaskComment(commentId: number): Promise<void> {
    await api.delete(`/tasks/comments/${commentId}`);
  }
}

export default SchedulesService;
