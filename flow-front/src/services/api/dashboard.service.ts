import { api } from './index';

export interface ScheduleTaskInfo {
  id: number;
  title: string;
  description?: string;
  status: string;
  statusCategory?: string;
  estimatedHours: number;
  actualHours: number;
  assignee: string | null;
  created: string;
  updated: string;
  startDate: string;
  endDate: string;
  sprint: string | null;
  sprintStatus?: string;
  priority?: string;
  onTime?: boolean;
  scheduleId: number;
  scheduleName: string;
  isBacklog?: boolean;
}

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  blockedTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  averageVelocity: number;
  averageLeadTime: number;
  reworkRate: number;
  recentCompletedTasks: number;
  statusDistribution: {
    todo: number;
    inProgress: number;
    completed: number;
    blocked: number;
    cancelled: number;
  };
  completionRate: number;
  velocity?: number;
  avgResolutionTime?: number;
  averageHoursVelocity?: number;
  hoursCompletionRate?: number;
  onTimeDeliveryRate?: number;
  totalSchedules?: number;
  activeSchedules?: number;
  overdueTasks?: number;
}

export interface DashboardProject {
  id: number;
  name: string;
  description: string;
}

export interface ScheduleInfo {
  id: number;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  totalTasks: number;
  completedTasks: number;
  totalEstimatedHours: number;
  totalActualHours: number;
}

export interface DashboardData {
  project: DashboardProject;
  schedules: ScheduleInfo[];
  tasks: ScheduleTaskInfo[];
  metrics: DashboardMetrics;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statusDistribution?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  priorityDistribution?: any;
}

export interface ProjectOption {
  id: string;
  name: string;
  description?: string;
}

export interface ProjectInfo {
  id: number;
  name: string;
  description: string;
  endDate?: string;
  startDate?: string;
  actualExpectedEndDate?: string;
  status: string;
  health: string;
  priority: string;
}

export class DashboardService {
  private static isInActiveSprintOrNoSprint(task: ScheduleTaskInfo): boolean {
    if (!task.sprintStatus) {
      return true;
    }

    const isActive = task.sprintStatus === 'Em andamento';
    return isActive;
  }

  static async getProjectInfo(projectId: string): Promise<ProjectInfo> {
    const response = await api.get(`/projects/${projectId}`);

    return {
      id: response.data.id,
      name: response.data.name,
      description: response.data.description || '',
      startDate: response.data.startDate,
      endDate: response.data.endDate,
      actualExpectedEndDate: response.data.actualExpectedEndDate,
      status: response.data.status || 'active',
      health: response.data.health || 'healthy',
      priority: response.data.priority || 'medium'
    };
  }

  static async getDashboardData(projectId?: string): Promise<DashboardData> {
    try {
      const allTasks: ScheduleTaskInfo[] = [];
      const scheduleInfos: ScheduleInfo[] = [];

      let project = { id: parseInt(projectId || '1'), name: 'Todos os Projetos', description: 'Dados agregados' };
      if (projectId && projectId !== 'all') {
        try {
          const projectResponse = await api.get(`/projects/${projectId}`);
          project = {
            id: projectResponse.data.id,
            name: projectResponse.data.name,
            description: projectResponse.data.description || ''
          };

          try {
            const scheduleResponse = await api.get(`/projects/${projectId}/schedule`);
            const projectSchedule = scheduleResponse.data || {};
            const projectTasks = projectSchedule.tasks || [];

            if (projectTasks.length > 0) {
              const activeTasks = projectTasks.filter((t: any) => !t.isBacklog);
              
              scheduleInfos.push({
                id: parseInt(projectId),
                name: project.name,
                description: project.description,
                status: 'active',
                startDate: projectResponse.data.startDate,
                expectedEndDate: projectResponse.data.endDate,
                actualEndDate: null,
                totalTasks: activeTasks.length,
                completedTasks: activeTasks.filter((t: any) => t.status === 'completed').length,
                totalEstimatedHours: activeTasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0),
                totalActualHours: activeTasks.reduce((sum: number, t: any) => sum + (t.actualHours || 0), 0)
              });
            }
            
            // Adicionar tasks
            for (const task of projectTasks) {
              allTasks.push({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status?.code || task.status,
                estimatedHours: task.estimatedHours || 0,
                actualHours: task.actualHours || 0,
                assignee: task.assignee?.name || null,
                created: task.createdAt,
                updated: task.updatedAt,
                startDate: task.startDate || '',
                endDate: task.endDate || '',
                sprint: task.sprint?.name || null,
                sprintStatus: task.sprint?.statusSprint?.name || null,
                isBacklog: task.isBacklog || false,
                onTime: (() => {
                  if (!task.endDate || task.endDate === '') return null;
                  
                  try {
                    const endDate = new Date(task.endDate);
                    const today = new Date();
                    
                    if (isNaN(endDate.getTime())) return null;
                    
                    if ((task.status?.code || task.status) === 'completed') {
                      const completedDate = new Date(task.updatedAt);
                      return completedDate <= endDate;
                    }
                    
                    return today <= endDate;
                  } catch {
                    return null;
                  }
                })(),
                scheduleId: parseInt(projectId),
                scheduleName: project.name
              });
            }
          } catch (tasksError) {
            console.warn('Erro ao buscar tasks do projeto:', tasksError);
          }
        } catch (error) {
          console.warn('Erro ao buscar informações do projeto:', error);
        }
      }
      
      // Calcular métricas
      const metrics = this.calculateMetrics(allTasks);
      
      return {
        project,
        schedules: scheduleInfos,
        tasks: allTasks,
        metrics
      };
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new Error('Erro ao carregar dados do dashboard');
    }
  }

  private static calculateMetrics(tasks: ScheduleTaskInfo[]): DashboardMetrics {
    const activeTasks = tasks.filter(t => !t.isBacklog && this.isInActiveSprintOrNoSprint(t));
    const totalTasks = activeTasks.length;
    const completedTasks = activeTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = activeTasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = activeTasks.filter(t => t.status === 'todo').length;
    const blockedTasks = activeTasks.filter(t => t.status === 'blocked').length;
    const cancelledTasks = activeTasks.filter(t => t.status === 'cancelled').length;
    const totalEstimatedHours = activeTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const totalActualHours = activeTasks.reduce((sum, t) => sum + t.actualHours, 0);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const hoursCompletionRate = totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0;
    const tasksWithDeadline = activeTasks.filter(t => t.endDate && t.endDate !== '' && t.onTime !== null);
    const onTimeTasks = tasksWithDeadline.filter(t => t.onTime === true).length;
    const onTimeDeliveryRate = tasksWithDeadline.length > 0 ? Math.round((onTimeTasks / tasksWithDeadline.length) * 100) : 0;

    const overdueTasks = activeTasks.filter(t => {
      if (!t.endDate || t.endDate === '' || t.status === 'completed') return false;
      try {
        const endDate = new Date(t.endDate);
        return !isNaN(endDate.getTime()) && endDate < new Date();
      } catch {
        return false;
      }
    }).length;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      blockedTasks,
      totalEstimatedHours,
      totalActualHours,
      averageVelocity: 0,
      averageLeadTime: 0,
      reworkRate: 0,
      recentCompletedTasks: activeTasks.filter(t => {
        if (t.status !== 'completed') return false;
        const updatedDate = new Date(t.updated);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return updatedDate >= sevenDaysAgo;
      }).length,
      statusDistribution: {
        todo: todoTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        blocked: blockedTasks,
        cancelled: cancelledTasks
      },
      completionRate,
      hoursCompletionRate,
      onTimeDeliveryRate,
      overdueTasks
    };
  }

  static async getAvailableProjects(): Promise<ProjectOption[]> {
    const response = await api.get('/projects');
    let projects = response.data;
    if (projects && typeof projects === 'object' && !Array.isArray(projects)) {
      if (projects.data && Array.isArray(projects.data)) {
        projects = projects.data;
      } else if (projects.projects && Array.isArray(projects.projects)) {
        projects = projects.projects;
      } else {
        throw new Error('Formato de resposta inválido para projetos');
      }
    }

    if (!Array.isArray(projects)) {
      throw new Error('Resposta de projetos deve ser um array');
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return projects.map((project: any) => ({
      id: project.id.toString(),
      name: project.name,
      description: project.description || ''
    }));
  }
}

export default DashboardService;