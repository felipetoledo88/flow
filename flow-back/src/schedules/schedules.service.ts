import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { Task, TaskStatusEnum } from './entities/task.entity';
import { TaskStatus } from './entities/task-status.entity';
import {
  TaskDependency,
  DependencyType,
} from './entities/task-dependency.entity';
import { TaskHoursHistory } from './entities/task-hours-history.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskHoursDto } from './dto/update-task-hours.dto';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import {
  DateCalculatorService,
  WorkCapacity,
} from './services/date-calculator.service';
import { TeamsService } from '../teams/teams.service';
import { SprintsService } from '../sprints/sprints.service';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { Sprint } from '../common/entities/sprint.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskStatus)
    private readonly taskStatusRepository: Repository<TaskStatus>,
    @InjectRepository(TaskDependency)
    private readonly dependencyRepository: Repository<TaskDependency>,
    @InjectRepository(TaskHoursHistory)
    private readonly hoursHistoryRepository: Repository<TaskHoursHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Sprint)
    private readonly sprintRepository: Repository<Sprint>,
    private readonly dateCalculatorService: DateCalculatorService,
    private readonly teamsService: TeamsService,
    private readonly sprintsService: SprintsService,
  ) {}

  private async getDefaultStatusId(): Promise<number> {
    const todoStatus = await this.taskStatusRepository.findOne({
      where: { code: TaskStatusEnum.TODO },
    });
    return todoStatus?.id || 1;
  }

  private parseDateToUTC(dateInput: Date | string): Date {
    if (dateInput instanceof Date) {
      // Se já é Date, pega os componentes e cria UTC
      const year = dateInput.getUTCFullYear();
      const month = dateInput.getUTCMonth();
      const day = dateInput.getUTCDate();
      return new Date(Date.UTC(year, month, day));
    }
    const dateStr = dateInput.toString();
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    return new Date(dateInput);
  }

  private dateToString(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getUTCFullYear() === date2.getUTCFullYear() &&
      date1.getUTCMonth() === date2.getUTCMonth() &&
      date1.getUTCDate() === date2.getUTCDate()
    );
  }

  async create(createScheduleDto: CreateScheduleDto): Promise<Schedule> {
    const { projectId } = createScheduleDto;
    if (!projectId && createScheduleDto.teamId) {
      const team = await this.teamsService.findOne(createScheduleDto.teamId);
    }
    const schedule = this.scheduleRepository.create({
      name: createScheduleDto.name,
      description: createScheduleDto.description,
      status: createScheduleDto.status,
      startDate: createScheduleDto.startDate,
      expectedEndDate: createScheduleDto.expectedEndDate,
      projectId,
    });
    const savedSchedule = await this.scheduleRepository.save(schedule);
    if (createScheduleDto.tasks && createScheduleDto.tasks.length > 0) {
      const createdTasks: Task[] = [];
      for (const taskDto of createScheduleDto.tasks) {
        const task = this.taskRepository.create({
          title: taskDto.title,
          description: taskDto.description,
          assigneeId: taskDto.assigneeId,
          estimatedHours: taskDto.estimatedHours,
          actualHours: taskDto.actualHours || 0,
          sprintId: taskDto.sprintId,
          statusId: taskDto.statusId || (await this.getDefaultStatusId()),
          order: taskDto.order || 0,
          isBacklog: taskDto.isBacklog || false,
          projectId: savedSchedule.projectId,
          startDate: savedSchedule.startDate as any,
          endDate: savedSchedule.startDate as any,
          expectedStartDate: savedSchedule.startDate as any,
          expectedEndDate: savedSchedule.startDate as any,
        });
        createdTasks.push(task);
      }
      await this.taskRepository.save(createdTasks);
      const assigneeIds = new Set<number>();
      for (const task of createdTasks) {
        assigneeIds.add(task.assigneeId);
      }
      for (const assigneeId of assigneeIds) {
        await this.recalculateAllTasksOfAssignee(
          assigneeId,
          savedSchedule.projectId,
        );
      }
    }
    return this.findOne(savedSchedule.id);
  }

  async findAll(projectId?: number): Promise<any[]> {
    const where = projectId
      ? { projectId, isDeleted: false }
      : { isDeleted: false };
    const schedules = await this.scheduleRepository.find({
      where,
      relations: [
        'project',
        'project.director',
        'team',
        'team.members',
        'team.members.user',
        'tasks',
      ],
      order: { createdAt: 'DESC' },
    });
    return schedules.map((schedule) => {
      const tasks = schedule.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (t) => t.status?.code === TaskStatusEnum.COMPLETED,
      ).length;
      const inProgressTasks = tasks.filter(
        (t) => t.status?.code === TaskStatusEnum.IN_PROGRESS,
      ).length;
      const todoTasks = tasks.filter(
        (t) => t.status?.code === TaskStatusEnum.TODO,
      ).length;
      const blockedTasks = tasks.filter(
        (t) => t.status?.code === TaskStatusEnum.BLOCKED,
      ).length;
      const totalEstimatedHours = tasks.reduce(
        (sum, t) => sum + Number(t.estimatedHours),
        0,
      );
      const totalActualHours = tasks.reduce(
        (sum, t) => sum + Number(t.actualHours),
        0,
      );
      const progressPercentage =
        totalEstimatedHours > 0
          ? Math.round((totalActualHours / totalEstimatedHours) * 100)
          : 0;

      return {
        ...schedule,
        statistics: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          todoTasks,
          blockedTasks,
          totalEstimatedHours,
          totalActualHours,
          progressPercentage: Math.min(progressPercentage, 100),
        },
      };
    });
  }

  async findOne(id: number): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, isDeleted: false },
      relations: [
        'project',
        'project.director',
        'team',
        'team.members',
        'team.members.user',
        'tasks',
        'tasks.assignee',
        'tasks.status',
        'tasks.sprint',
        'tasks.dependencies',
        'tasks.dependencies.dependsOn',
        'tasks.dependents',
      ],
    });
    if (!schedule) {
      throw new NotFoundException(`Cronograma com ID ${id} não encontrado`);
    }
    return schedule;
  }

  async update(
    id: number,
    updateScheduleDto: UpdateScheduleDto,
  ): Promise<Schedule> {
    const schedule = await this.findOne(id);
    Object.assign(schedule, updateScheduleDto);
    return this.scheduleRepository.save(schedule);
  }

  async remove(id: number): Promise<void> {
    const schedule = await this.findOne(id);
    if (schedule.projectId) {
      try {
        const sprints = await this.sprintsService.findByProject(
          schedule.projectId,
        );
        for (const sprint of sprints) {
          await this.taskRepository
            .createQueryBuilder()
            .update()
            .set({ sprintId: () => 'NULL' })
            .where('sprintId = :sprintId', { sprintId: sprint.id })
            .execute();
        }
        for (const sprint of sprints) {
          await this.sprintsService.remove(sprint.id);
        }
      } catch (error) {
        console.warn(
          `Erro ao deletar sprints do projeto ${schedule.projectId}:`,
          error,
        );
      }
    }
    await this.scheduleRepository.softDelete(schedule.id);
  }

  async createTask(
    scheduleId: number,
    createTaskDto: CreateTaskDto,
  ): Promise<Task> {
    const schedule = await this.findOne(scheduleId);
    if (createTaskDto.order === undefined || createTaskDto.order === null) {
      const maxOrderTask = await this.taskRepository.findOne({
        where: { projectId: schedule.projectId, assigneeId: createTaskDto.assigneeId },
        order: { order: 'DESC' },
      });
      createTaskDto.order = maxOrderTask && maxOrderTask.order !== null ? maxOrderTask.order + 1 : 0;
    }
    const task = this.taskRepository.create({
      title: createTaskDto.title,
      description: createTaskDto.description,
      assigneeId: createTaskDto.assigneeId,
      estimatedHours: createTaskDto.estimatedHours,
      actualHours: createTaskDto.actualHours || 0,
      sprintId: createTaskDto.sprintId,
      statusId: createTaskDto.statusId || (await this.getDefaultStatusId()),
      order: createTaskDto.order ?? null,
      isBacklog: createTaskDto.isBacklog || false,
      projectId: schedule.projectId,
      startDate: schedule.startDate,
      endDate: schedule.startDate,
      expectedStartDate: schedule.startDate,
      expectedEndDate: schedule.startDate,
    });
    const savedTask = await this.taskRepository.save(task);
    if (createTaskDto.assigneeId) {
      await this.recalculateAllTasksOfAssignee(
        createTaskDto.assigneeId,
        schedule.projectId,
      );
    }
    const recalculatedTask = await this.taskRepository.findOne({
      where: { id: savedTask.id },
      relations: [
        'project',
        'assignee',
        'dependencies',
        'dependents',
        'status',
        'sprint',
      ],
    });

    if (!recalculatedTask) {
      throw new NotFoundException(
        `Tarefa com ID ${savedTask.id} não encontrada após recálculo`,
      );
    }
    return recalculatedTask;
  }

  async updateTask(
    taskId: number,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: [
        'project',
        'assignee',
        'dependencies',
        'dependents',
        'status',
        'sprint',
      ],
    });
    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }

    const oldAssigneeId = task.assigneeId;
    const oldEstimatedHours = task.estimatedHours;
    const oldStatusId = task.statusId;
    const wasCompleted = task.status?.code === TaskStatusEnum.COMPLETED;
    const assigneeChanged =
      updateTaskDto.assigneeId && updateTaskDto.assigneeId !== oldAssigneeId;
    const estimatedHoursChanged =
      updateTaskDto.estimatedHours &&
      updateTaskDto.estimatedHours !== oldEstimatedHours;
    const statusChanged =
      updateTaskDto.statusId !== undefined && updateTaskDto.statusId !== oldStatusId;
    if (updateTaskDto.statusId !== undefined && updateTaskDto.statusId !== task.statusId) {
      task.statusId = updateTaskDto.statusId;
      delete (task as any).status;
    }

    if (assigneeChanged) {
      task.assigneeId = updateTaskDto.assigneeId!;
      delete (task as any).assignee;
    }
    Object.assign(task, updateTaskDto);
    if (estimatedHoursChanged && !assigneeChanged) {
      const project = await this.scheduleRepository.manager
        .getRepository('Project')
        .findOne({
          where: { id: task.projectId },
          relations: ['team'],
        });
      const teamId = project?.team?.id;
      if (!teamId) {
        throw new BadRequestException('Project must have a team assigned');
      }
      const teamMember = await this.teamsService.findMemberByUserId(
        teamId,
        task.assigneeId,
      );
      const workCapacity =
        this.dateCalculatorService.getWorkCapacityFromTeamMember(teamMember);
      const startDate = task.expectedStartDate || task.startDate;
      const estimatedHours = task.estimatedHours || 0;
      if (startDate && estimatedHours) {
        const expectedEndDate = this.dateCalculatorService.calculateEndDate(
          this.parseDateToUTC(startDate),
          estimatedHours,
          workCapacity,
        );
        task.expectedEndDate = this.dateToString(expectedEndDate) as any;
        const hoursToUse =
          task.status?.code === TaskStatusEnum.COMPLETED
            ? task.actualHours
            : Math.max(task.estimatedHours || 0, task.actualHours);
        if (task.startDate) {
          const endDate = this.dateCalculatorService.calculateEndDate(
            this.parseDateToUTC(task.startDate),
            hoursToUse,
            workCapacity,
          );
          task.endDate = this.dateToString(endDate) as any;
        }
      }
    }
    await this.taskRepository.save(task);

    let taskWasMarkedAsCompleted = false;
    let taskWasUnmarkedAsCompleted = false;
    if (statusChanged) {
      const updatedTaskForStatusCheck = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['status'],
      });
      const isNowCompleted = updatedTaskForStatusCheck?.status?.code === TaskStatusEnum.COMPLETED;
      taskWasMarkedAsCompleted = !wasCompleted && isNowCompleted;
      taskWasUnmarkedAsCompleted = wasCompleted && !isNowCompleted;
    }
    
    if (assigneeChanged) {
      await this.recalculateAllTasksOfAssignee(oldAssigneeId, task.projectId);
      await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);
    } else if (estimatedHoursChanged) {
      await this.recalculateDependentTasks(task);
      await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);
    } else if (taskWasMarkedAsCompleted || taskWasUnmarkedAsCompleted) {
      await this.recalculateDependentTasks(task);
      await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);
    }

    const updatedTask = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: [
        'project',
        'assignee',
        'dependencies',
        'dependents',
        'status',
        'sprint',
      ],
    });
    if (!updatedTask) {
      throw new NotFoundException(`Tarefa atualizada não encontrada`);
    }
    return updatedTask;
  }

  async updateTaskHours(
    taskId: number,
    updateHoursDto: UpdateTaskHoursDto,
    userId?: number,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'assignee', 'dependents', 'dependents.task', 'status'],
    });
    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }
    const previousHours = Number(task.actualHours);
    const newHours = Number(updateHoursDto.actualHours);
    const hoursChanged = newHours - previousHours;
    task.actualHours = updateHoursDto.actualHours;
    const project = await this.scheduleRepository.manager
      .getRepository('Project')
      .findOne({
        where: { id: task.projectId },
        relations: ['team'],
      });
    const teamId = project?.team?.id;
    if (!teamId) {
      throw new BadRequestException('Project must have a team assigned');
    }
    const teamMember = await this.teamsService.findMemberByUserId(
      teamId,
      task.assigneeId,
    );
    const workCapacity =
      this.dateCalculatorService.getWorkCapacityFromTeamMember(teamMember);
    if (task.startDate) {
      const hoursToUse =
        task.status?.code === TaskStatusEnum.COMPLETED
          ? task.actualHours
          : Math.max(task.estimatedHours || 0, task.actualHours);

      const calculatedEndDate = this.dateCalculatorService.calculateEndDate(
        this.parseDateToUTC(task.startDate),
        hoursToUse,
        workCapacity,
      );
      task.endDate = this.dateToString(calculatedEndDate) as any;
    }
    await this.taskRepository.save(task);
    const updatedTaskForStatusCheck = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['status'],
    });
    if (hoursChanged !== 0 && userId) {
      try {
        const historyEntry = this.hoursHistoryRepository.create({
          taskId: task.id,
          userId,
          previousHours,
          newHours,
          hoursChanged,
          comment: updateHoursDto.comment,
          reason: updateHoursDto.reason,
        });
        const savedHistory =
          await this.hoursHistoryRepository.save(historyEntry);
      } catch (historyError) {
        console.error(`[ERROR] Erro ao salvar histórico:`, historyError);
      }
    }

    if (updatedTaskForStatusCheck?.status?.code === TaskStatusEnum.COMPLETED) {
      await this.recalculateDependentTasks(task);
      await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);
    }

    const updatedTask = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: [
        'project',
        'assignee',
        'dependencies',
        'dependents',
        'status',
        'sprint',
      ],
    });
    if (!updatedTask) {
      throw new NotFoundException(
        `Tarefa com ID ${taskId} não encontrada após atualização`,
      );
    }
    return updatedTask;
  }

  private async recalculateDependentTasks(
    predecessorTask: Task,
  ): Promise<void> {
    const dependents = await this.dependencyRepository.find({
      where: { dependsOnId: predecessorTask.id },
      relations: ['task', 'task.assignee', 'task.project'],
    });
    for (const dependency of dependents) {
      const task = dependency.task;
      const project = await this.scheduleRepository.manager
        .getRepository('Project')
        .findOne({
          where: { id: task.projectId },
          relations: ['team'],
        });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const teamId = project?.team?.id;
      if (!teamId) {
        throw new BadRequestException('Project must have a team assigned');
      }
      const teamMember = await this.teamsService.findMemberByUserId(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        teamId,
        task.assigneeId,
      );
      const workCapacity =
        this.dateCalculatorService.getWorkCapacityFromTeamMember(teamMember);
      if (dependency.type === DependencyType.FINISH_TO_START) {
        if (!predecessorTask.endDate) {
          continue;
        }
        const calculatedStartDate =
          this.dateCalculatorService.calculateDependentStartDate(
            this.parseDateToUTC(predecessorTask.endDate),
            workCapacity,
            dependency.lagDays,
          );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        task.startDate = this.dateToString(calculatedStartDate) as any;
        const hoursToUse =
          task.status?.code === TaskStatusEnum.COMPLETED
            ? task.actualHours
            : Math.max(task.estimatedHours || 0, task.actualHours);
        const calculatedEndDate = this.dateCalculatorService.calculateEndDate(
          calculatedStartDate,
          hoursToUse,
          workCapacity,
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        task.endDate = this.dateToString(calculatedEndDate) as any;
        await this.taskRepository.save(task);
        await this.recalculateDependentTasks(task);
      }
    }
  }

  /**
   * Constrói um calendário otimizado que leva em conta o estado atual das tarefas
   * para identificar lacunas que podem ser preenchidas.
   */
  private buildOptimizedCalendar(
    tasks: Task[],
    workCapacity: WorkCapacity,
    firstWorkDay: Date,
  ): Array<{ date: Date; availableHours: number; usedHours: number }> {
    const calendar: Array<{ date: Date; availableHours: number; usedHours: number }> = [];
    
    // Calcular o período total necessário (do início até a última tarefa)
    const currentDate = new Date(firstWorkDay);
    const maxDays = 365; // Limite de segurança
    let daysGenerated = 0;
    
    while (daysGenerated < maxDays) {
      if (workCapacity.workDays.includes(currentDate.getUTCDay())) {
        calendar.push({
          date: new Date(currentDate),
          availableHours: workCapacity.dailyWorkHours,
          usedHours: 0,
        });
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      daysGenerated++;
      
      // Se já temos dias suficientes para as tarefas, pode parar
      if (calendar.length > tasks.length * 5) break; // heurística: 5 dias por tarefa
    }
    
    return calendar;
  }

  /**
   * Aloca horas no calendário otimizado, priorizando o preenchimento de lacunas.
   */
  private allocateHoursInOptimizedCalendar(
    calendar: Array<{ date: Date; availableHours: number; usedHours: number }>,
    hoursToAllocate: number,
    workCapacity: WorkCapacity,
  ): { startDate: Date; endDate: Date } {
    let remainingHours = hoursToAllocate;
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    // Primeiro, tenta preencher lacunas existentes (dias com horas disponíveis)
    const daysWithAvailableHours = calendar.filter(day => day.availableHours > 0);
    
    for (const day of daysWithAvailableHours) {
      if (remainingHours <= 0) break;
      
      if (!startDate) {
        startDate = new Date(day.date);
      }
      
      const hoursToUseToday = Math.min(remainingHours, day.availableHours);
      day.usedHours += hoursToUseToday;
      day.availableHours -= hoursToUseToday;
      remainingHours -= hoursToUseToday;
      endDate = new Date(day.date);
    }

    // Se ainda há horas restantes, usa o método original para estender o calendário
    if (remainingHours > 0) {
      const extendedAllocation = this.allocateHoursInCalendar(calendar, remainingHours, workCapacity);
      if (!startDate) {
        startDate = extendedAllocation.startDate;
      }
      endDate = extendedAllocation.endDate;
    }

    if (!startDate || !endDate) {
      throw new Error('Failed to allocate hours in optimized calendar - no valid dates');
    }

    return { startDate, endDate };
  }

  /**
   * Encontra o próximo dia útil com horas disponíveis ou cria um novo dia.
   * @param calendar Array de estados dos dias
   * @param workCapacity Capacidade de traballastTaskOfAssigneeho do desenvolvedor
   * @param fromDate Data a partir da qual buscar (opcional)
   * @returns Estado do dia encontrado ou criado
   */
  private findOrCreateAvailableDay(
    calendar: Array<{ date: Date; availableHours: number; usedHours: number }>,
    workCapacity: WorkCapacity,
    fromDate?: Date,
  ): { date: Date; availableHours: number; usedHours: number } {
    if (!fromDate) {
      if (calendar.length === 0) {
        throw new Error('Calendar is empty and no fromDate provided');
      }
      const lastDay = calendar[calendar.length - 1];
      if (lastDay.availableHours > 0) {
        return lastDay;
      }
      fromDate = lastDay.date;
    }
    for (const day of calendar) {
      if (this.isSameDay(day.date, fromDate) || day.date > fromDate) {
        if (day.availableHours > 0) {
          return day;
        }
      }
    }
    const nextDate = new Date(fromDate);
    const existingDay = calendar.find((d) => this.isSameDay(d.date, fromDate));
    if (existingDay && existingDay.availableHours === 0) {
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }
    while (!workCapacity.workDays.includes(nextDate.getUTCDay())) {
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }
    const newDay = {
      date: new Date(nextDate),
      availableHours: workCapacity.dailyWorkHours,
      usedHours: 0,
    };
    calendar.push(newDay);
    return newDay;
  }

  /**
   * Aloca horas no calendário do desenvolvedor, distribuindo entre dias conforme necessário.
   * @param calendar Array de estados dos dias
   * @param hoursToAllocate Horas totais a alocar
   * @param workCapacity Capacidade de trabalho do desenvolvedor
   * @returns Objeto com data de início e data de fim da alocação
   */
  private allocateHoursInCalendar(
    calendar: Array<{ date: Date; availableHours: number; usedHours: number }>,
    hoursToAllocate: number,
    workCapacity: WorkCapacity,
  ): { startDate: Date; endDate: Date } {
    let remainingHours = hoursToAllocate;
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    while (remainingHours > 0) {
      const currentDay = this.findOrCreateAvailableDay(
        calendar,
        workCapacity,
        endDate || undefined,
      );
      if (!startDate) {
        startDate = new Date(currentDay.date);
      }
      const hoursToUseToday = Math.min(
        remainingHours,
        currentDay.availableHours,
      );
      currentDay.usedHours += hoursToUseToday;
      currentDay.availableHours -= hoursToUseToday;
      remainingHours -= hoursToUseToday;
      endDate = new Date(currentDay.date);
    }
    if (!startDate || !endDate) {
      throw new Error('Failed to allocate hours - no valid dates');
    }
    return { startDate, endDate };
  }

  /**
   * Recalcula TODAS as tarefas de um desenvolvedor específico em um cronograma.
   *
   * IMPLEMENTAÇÃO OTIMIZADA com preenchimento automático de lacunas.
   *
   * Esta função implementa o fluxo A→B→C→G→D→E→F:
   * - A: Pegar lista de atividades ordenadas ✓
   * - B: Calcular calendário otimizado preenchendo lacunas ✓
   * - C: Iterar por cada atividade ✓
   * - G: Considerar dias úteis (skip fins de semana) ✓
   * - D: Controlar saldo de horas disponíveis do dia atual ✓
   * - E: Se atividade não cabe no dia, dividir e continuar no próximo ✓
   * - F: Atualizar datas de início/fim da atividade ✓
   *
   * @param assigneeId - ID do desenvolvedor
   * @param projectId - ID do projeto
   */
  private async recalculateAllTasksOfAssignee(
    assigneeId: number,
    projectId: number,
  ): Promise<void> {
    const tasks = await this.taskRepository.find({
      where: { projectId, assigneeId, isBacklog: false },
      relations: ['project', 'assignee', 'status', 'sprint'],
      order: { order: 'ASC' },
    });
    if (tasks.length === 0) {
      return;
    }
    const project = await this.scheduleRepository.manager
      .getRepository('Project')
      .findOne({
        where: { id: projectId },
        relations: ['team'],
      });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    const teamId = project.team?.id;
    if (!teamId) {
      throw new BadRequestException('Projeto deve ter uma equipe atribuída');
    }
    const teamMember = await this.teamsService.findMemberByUserId(
      teamId,
      assigneeId,
    );
    const workCapacity =
      this.dateCalculatorService.getWorkCapacityFromTeamMember(teamMember);
    const tasksBySprint = new Map<number | null, typeof tasks>();
    tasks.forEach((task) => {
      const sprintId = task.sprintId || null;
      if (!tasksBySprint.has(sprintId)) {
        tasksBySprint.set(sprintId, []);
      }
      tasksBySprint.get(sprintId)!.push(task);
    });
    const initialDate = project?.startDate
      ? this.parseDateToUTC(project.startDate)
      : new Date();
    const firstWorkDay = new Date(initialDate);
    while (!workCapacity.workDays.includes(firstWorkDay.getUTCDay())) {
      firstWorkDay.setUTCDate(firstWorkDay.getUTCDate() + 1);
    }

    const calendar = this.buildOptimizedCalendar(tasks, workCapacity, firstWorkDay);

    for (const [sprintId, sprintTasks] of tasksBySprint) {
      for (let i = 0; i < sprintTasks.length; i++) {
        const task = sprintTasks[i];
        const hoursForDateCalculation =
          task.status?.code === TaskStatusEnum.COMPLETED
            ? Number(task.actualHours)
            : Math.max(Number(task.estimatedHours), Number(task.actualHours));
        const hoursToOccupyInCalendar =
          task.status?.code === TaskStatusEnum.COMPLETED
            ? Number(task.actualHours)
            : Math.max(Number(task.estimatedHours), Number(task.actualHours));
        const { startDate, endDate } = this.allocateHoursInOptimizedCalendar(
          calendar,
          hoursToOccupyInCalendar,
          workCapacity,
        );
        task.startDate = this.dateToString(startDate) as any;
        task.endDate = this.dateToString(endDate) as any;
        task.expectedStartDate = this.dateToString(startDate) as any;
        const startDayState = calendar.find((d) =>
          this.isSameDay(d.date, startDate),
        );
        const hoursUsedInStartDay = startDayState
          ? startDayState.usedHours
          : hoursToOccupyInCalendar;
        const expectedEndDate =
          this.dateCalculatorService.calculateEndDateWithStartDayOffset(
            startDate,
            Number(task.estimatedHours),
            hoursUsedInStartDay - hoursToOccupyInCalendar,
            workCapacity,
          );
        task.expectedEndDate = this.dateToString(expectedEndDate) as any;
        await this.taskRepository.save(task);
      }
    }
    await this.updateProjectActualExpectedEndDate(projectId);
  }

  async removeTask(taskId: number): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }

    // Guarda o assigneeId e projectId antes de remover
    const assigneeId = task.assigneeId;
    const projectId = task.projectId;

    await this.taskRepository.softDelete(task.id);

    // Recalcula todas as tarefas do desenvolvedor para fechar o "buraco" no cronograma
    await this.recalculateAllTasksOfAssignee(assigneeId, projectId);
  }

  /**
   * Remove múltiplas tarefas em lote e recalcula as datas dos desenvolvedores afetados.
   * @param taskIds Array de IDs das tarefas a serem removidas
   */
  async removeTasksBulk(taskIds: number[]): Promise<{ deletedCount: number }> {
    if (!taskIds || taskIds.length === 0) {
      throw new BadRequestException('Nenhuma tarefa para excluir');
    }

    // Buscar todas as tarefas pelos IDs
    const tasks = await this.taskRepository.find({
      where: taskIds.map((id) => ({ id })),
      relations: ['project'],
    });

    if (tasks.length === 0) {
      throw new NotFoundException('Nenhuma das tarefas informadas foi encontrada');
    }

    // Agrupar por assignee e project para recálculo posterior
    const affectedAssignees = new Map<
      string,
      { assigneeId: number; projectId: number }
    >();

    for (const task of tasks) {
      const key = `${task.assigneeId}-${task.projectId}`;
      affectedAssignees.set(key, {
        assigneeId: task.assigneeId,
        projectId: task.projectId,
      });
    }

    // Soft delete de todas as tarefas encontradas
    const foundTaskIds = tasks.map((t) => t.id);
    await this.taskRepository.softDelete(foundTaskIds);

    // Recalcular para cada assignee afetado
    for (const { assigneeId, projectId } of affectedAssignees.values()) {
      await this.recalculateAllTasksOfAssignee(assigneeId, projectId);
    }

    // Atualizar data fim prevista do projeto (pegar o primeiro projectId encontrado)
    if (tasks.length > 0) {
      const projectIds = new Set(tasks.map((t) => t.projectId));
      for (const projectId of projectIds) {
        await this.updateProjectActualExpectedEndDate(projectId);
      }
    }

    return { deletedCount: foundTaskIds.length };
  }

  /**
   * Valida se todos os IDs referenciados existem no banco de dados
   */
  private async validateImportData(
    tasksData: CreateTaskDto[],
    projectId: number,
  ): Promise<void> {
    const errors: string[] = [];

    // Validar projeto existe
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new BadRequestException(
        `Projeto com ID ${projectId} não encontrado`,
      );
    }

    // Coletar IDs únicos para validação em batch
    const assigneeIds = new Set<number>();
    const sprintIds = new Set<number>();
    const statusIds = new Set<number>();

    tasksData.forEach((task, index) => {
      const lineNumber = index + 2; // +2 porque CSV começa em linha 1 e tem header

      if (task.assigneeId) {
        assigneeIds.add(task.assigneeId);
      }
      if (task.sprintId) {
        sprintIds.add(task.sprintId);
      }
      if (task.statusId) {
        statusIds.add(task.statusId);
      }
    });

    // Validar assignees existem
    if (assigneeIds.size > 0) {
      const existingAssignees = await this.userRepository.find({
        where: Array.from(assigneeIds).map((id) => ({ id })),
        select: ['id'],
      });
      const existingAssigneeIds = new Set(existingAssignees.map((u) => u.id));

      tasksData.forEach((task, index) => {
        const lineNumber = index + 2;
        if (task.assigneeId && !existingAssigneeIds.has(task.assigneeId)) {
          errors.push(
            `Linha ${lineNumber}: Responsável com ID ${task.assigneeId} não encontrado`,
          );
        }
      });
    }

    // Validar sprints existem
    if (sprintIds.size > 0) {
      const existingSprints = await this.sprintRepository.find({
        where: Array.from(sprintIds).map((id) => ({ id })),
        select: ['id'],
      });
      const existingSprintIds = new Set(existingSprints.map((s) => s.id));

      tasksData.forEach((task, index) => {
        const lineNumber = index + 2;
        if (task.sprintId && !existingSprintIds.has(task.sprintId)) {
          errors.push(
            `Linha ${lineNumber}: Sprint com ID ${task.sprintId} não encontrado`,
          );
        }
      });
    }

    // Validar status existem
    if (statusIds.size > 0) {
      const existingStatuses = await this.taskStatusRepository.find({
        where: Array.from(statusIds).map((id) => ({ id })),
        select: ['id'],
      });
      const existingStatusIds = new Set(existingStatuses.map((s) => s.id));

      tasksData.forEach((task, index) => {
        const lineNumber = index + 2;
        if (task.statusId && !existingStatusIds.has(task.statusId)) {
          errors.push(
            `Linha ${lineNumber}: Status com ID ${task.statusId} não encontrado`,
          );
        }
      });
    }

    // Se houver erros, lançar exceção com todas as mensagens
    if (errors.length > 0) {
      throw new BadRequestException(
        `Erros encontrados na validação:\n${errors.join('\n')}`,
      );
    }
  }

  /**
   * Importa múltiplas tarefas em massa e recalcula datas automaticamente.
   */
  async importTasksBulk(
    projectId: number,
    tasksData: CreateTaskDto[],
  ): Promise<Task[]> {
    if (!tasksData || tasksData.length === 0) {
      throw new BadRequestException('Nenhuma tarefa para importar');
    }

    // Validar IDs antes de importar (já valida se o projeto existe)
    await this.validateImportData(tasksData, projectId);

    // Buscar o projeto para obter as datas
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    // Preparar tarefas para inserção
    const tasksToCreate: Task[] = [];
    const defaultStatusId = await this.getDefaultStatusId();
    const now = new Date();
    const maxOrderByAssignee = new Map<number, number>();

    // Pre-calcular o maior order por assignee
    for (const taskDto of tasksData) {
      if (taskDto.assigneeId && !maxOrderByAssignee.has(taskDto.assigneeId)) {
        const maxOrderTask = await this.taskRepository.findOne({
          where: { projectId: projectId, assigneeId: taskDto.assigneeId },
          order: { order: 'DESC' },
        });
        maxOrderByAssignee.set(taskDto.assigneeId, maxOrderTask && maxOrderTask.order !== null ? maxOrderTask.order : -1);
      }
    }

    for (const taskDto of tasksData) {
      let taskOrder: number | null = taskDto.order ?? null;
      
      // Se order não foi especificado, calcular automaticamente por assignee
      if (taskDto.order === undefined || taskDto.order === null) {
        if (taskDto.assigneeId) {
          const currentMax = maxOrderByAssignee.get(taskDto.assigneeId) ?? -1;
          taskOrder = currentMax + 1;
          maxOrderByAssignee.set(taskDto.assigneeId, taskOrder);
        }
      }

      const task = this.taskRepository.create({
        title: taskDto.title,
        description: taskDto.description,
        assigneeId: taskDto.assigneeId,
        estimatedHours: taskDto.estimatedHours,
        actualHours: taskDto.actualHours || 0,
        sprintId: taskDto.sprintId,
        statusId: taskDto.statusId || defaultStatusId,
        order: taskOrder,
        isBacklog: taskDto.isBacklog ?? true, // Por padrão, tarefas importadas vão para o backlog
        projectId: projectId,
        startDate: project?.startDate || now,
        endDate: project?.startDate || now,
        expectedStartDate: project?.startDate || now,
        expectedEndDate: project?.endDate || now,
      });
      tasksToCreate.push(task);
    }

    // Salvar todas as tarefas de uma vez
    const savedTasks = await this.taskRepository.save(tasksToCreate);

    // Agrupar tarefas por assigneeId para recalcular
    const assigneeIds = new Set<number>();
    savedTasks.forEach((task) => {
      if (task.assigneeId) {
        assigneeIds.add(task.assigneeId);
      }
    });

    // Recalcular datas para cada desenvolvedor afetado
    const recalculatePromises = Array.from(assigneeIds).map((assigneeId) =>
      this.recalculateAllTasksOfAssignee(assigneeId, projectId),
    );
    await Promise.all(recalculatePromises);

    // Buscar tarefas recalculadas com relações
    const taskIds = savedTasks.map((t) => t.id);
    const recalculatedTasks = await this.taskRepository.find({
      where: taskIds.map((id) => ({ id })),
      relations: [
        'project',
        'assignee',
        'dependencies',
        'dependents',
        'status',
        'sprint',
      ],
    });

    return recalculatedTasks;
  }

  async createDependency(
    createDependencyDto: CreateTaskDependencyDto,
  ): Promise<TaskDependency> {
    if (createDependencyDto.taskId === createDependencyDto.dependsOnId) {
      throw new BadRequestException('Uma tarefa não pode depender de si mesma');
    }

    const task = await this.taskRepository.findOne({
      where: { id: createDependencyDto.taskId },
      relations: ['project'],
    });

    const dependsOn = await this.taskRepository.findOne({
      where: { id: createDependencyDto.dependsOnId },
    });

    if (!task || !dependsOn) {
      throw new NotFoundException(
        'Uma ou ambas as tarefas não foram encontradas',
      );
    }

    const existingDependency = await this.dependencyRepository.findOne({
      where: {
        taskId: createDependencyDto.taskId,
        dependsOnId: createDependencyDto.dependsOnId,
      },
    });

    if (existingDependency) {
      throw new BadRequestException('Esta dependência já existe');
    }

    const dependency = this.dependencyRepository.create(createDependencyDto);
    await this.dependencyRepository.save(dependency);

    // Busca o projeto para obter team
    const project = await this.scheduleRepository.manager
      .getRepository('Project')
      .findOne({
        where: { id: task.projectId },
        relations: ['team'],
      });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const teamId = project?.team?.id;
    if (!teamId) {
      throw new BadRequestException('Project must have a team assigned');
    }

    const teamMember = await this.teamsService.findMemberByUserId(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      teamId,
      task.assigneeId,
    );

    const workCapacity =
      this.dateCalculatorService.getWorkCapacityFromTeamMember(teamMember);

    if (dependency.type === DependencyType.FINISH_TO_START) {
      if (dependsOn.endDate && task.estimatedHours) {
        // Só calcular se endDate da tarefa dependente e estimatedHours estão definidas

        // Calcula a nova data de início baseada na dependência
        const calculatedStartDate =
          this.dateCalculatorService.calculateDependentStartDate(
            this.parseDateToUTC(dependsOn.endDate),
            workCapacity,
            dependency.lagDays,
          );

        // Atualiza as datas PREVISTAS (baseline)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        task.expectedStartDate = this.dateToString(calculatedStartDate) as any;

        const calculatedExpectedEndDate =
          this.dateCalculatorService.calculateEndDate(
            calculatedStartDate,
            task.estimatedHours,
            workCapacity,
          );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        task.expectedEndDate = this.dateToString(
          calculatedExpectedEndDate,
        ) as any;

        // Atualiza as datas ATUAIS (realizado)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        task.startDate = this.dateToString(calculatedStartDate) as any;

        // NOVA LÓGICA: Se a tarefa está concluída, usa actualHours (permite antecipação)
        // Se não está concluída, usa o MAIOR valor (previne otimismo exagerado)
        const hoursToUse =
          task.status?.code === TaskStatusEnum.COMPLETED
            ? task.actualHours
            : Math.max(task.estimatedHours || 0, task.actualHours);

        const calculatedEndDate = this.dateCalculatorService.calculateEndDate(
          calculatedStartDate,
          hoursToUse,
          workCapacity,
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        task.endDate = this.dateToString(calculatedEndDate) as any;

        await this.taskRepository.save(task);
      }
    }

    return dependency;
  }

  async removeDependency(dependencyId: number): Promise<void> {
    const dependency = await this.dependencyRepository.findOne({
      where: { id: dependencyId },
    });

    if (!dependency) {
      throw new NotFoundException(
        `Dependência com ID ${dependencyId} não encontrada`,
      );
    }

    await this.dependencyRepository.softDelete(dependency.id);
  }

  async findTasksBySchedule(scheduleId: number): Promise<Task[]> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new NotFoundException(
        `Cronograma com ID ${scheduleId} não encontrado`,
      );
    }
    return this.taskRepository.find({
      where: { projectId: schedule.projectId },
      relations: [
        'assignee',
        'status',
        'sprint',
        'dependencies',
        'dependencies.dependsOn',
      ],
      order: { order: 'ASC', startDate: 'ASC' },
    });
  }

  /**
   * Busca o histórico de lançamentos de horas de uma tarefa
   * @param taskId ID da tarefa
   * @returns Array com o histórico de lançamentos
   */
  async getTaskHoursHistory(taskId: number): Promise<TaskHoursHistory[]> {
    // Verifica se a tarefa existe
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }

    const history = await this.hoursHistoryRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return history;
  }

  /**
   * Atualiza um registro do histórico de horas
   * @param historyId ID do registro de histórico
   * @param updateData dados para atualização
   * @returns registro atualizado
   */
  async updateTaskHoursHistory(
    historyId: number,
    updateData: { newHours: number; comment?: string },
  ): Promise<TaskHoursHistory> {
    // Busca o registro de histórico
    const historyEntry = await this.hoursHistoryRepository.findOne({
      where: { id: historyId },
      relations: ['user'],
    });

    if (!historyEntry) {
      throw new NotFoundException(
        `Registro de histórico com ID ${historyId} não encontrado`,
      );
    }

    // Busca a tarefa relacionada
    const task = await this.taskRepository.findOne({
      where: { id: historyEntry.taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(
        `Tarefa com ID ${historyEntry.taskId} não encontrada`,
      );
    }

    // Calcula a diferença entre as horas antigas e novas
    const oldHours = historyEntry.newHours;
    const hoursDifference = updateData.newHours - oldHours;

    // Atualiza o registro de histórico
    historyEntry.newHours = updateData.newHours;
    historyEntry.hoursChanged =
      updateData.newHours - historyEntry.previousHours;
    if (updateData.comment !== undefined) {
      historyEntry.comment = updateData.comment;
    }

    // Atualiza as horas atuais da tarefa
    task.actualHours = Number(task.actualHours) + hoursDifference;

    // Salva as alterações
    await this.hoursHistoryRepository.save(historyEntry);
    await this.taskRepository.save(task);

    // Só recalcular datas e dependências se a atividade foi marcada como concluída
    if (task.status?.code === TaskStatusEnum.COMPLETED) {
      await this.recalculateDependentTasks(task);
      await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);
    }

    return historyEntry;
  }

  /**
   * Exclui um registro do histórico de horas
   * @param historyId ID do registro de histórico
   */
  async deleteTaskHoursHistory(historyId: number): Promise<void> {
    // Busca o registro de histórico
    const historyEntry = await this.hoursHistoryRepository.findOne({
      where: { id: historyId },
    });

    if (!historyEntry) {
      throw new NotFoundException(
        `Registro de histórico com ID ${historyId} não encontrado`,
      );
    }

    // Busca a tarefa relacionada
    const task = await this.taskRepository.findOne({
      where: { id: historyEntry.taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(
        `Tarefa com ID ${historyEntry.taskId} não encontrada`,
      );
    }

    // Subtrai as horas do histórico das horas atuais da tarefa
    task.actualHours = Number(task.actualHours) - historyEntry.hoursChanged;

    // Remove o registro de histórico
    await this.hoursHistoryRepository.softDelete(historyEntry.id);

    // Atualiza a tarefa
    await this.taskRepository.save(task);

    // Só recalcular datas e dependências se a atividade foi marcada como concluída
    if (task.status?.code === TaskStatusEnum.COMPLETED) {
      await this.recalculateDependentTasks(task);
      await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);
    }
  }

  /**
   * Reordena as tarefas de um cronograma e recalcula as datas de todas as tarefas afetadas
   * @param scheduleId ID do cronograma
   * @param tasksOrder Array com taskId e newOrder
   */
  async reorderTasks(
    scheduleId: number,
    tasksOrder: { taskId: number; newOrder: number }[],
  ): Promise<Task[]> {
    // Verifica se o cronograma existe
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(
        `Cronograma com ID ${scheduleId} não encontrado`,
      );
    }

    // Busca todas as tarefas que serão reordenadas
    const tasks = await this.taskRepository.find({
      where: { projectId: schedule.projectId },
      relations: ['project', 'assignee'],
    });

    // Valida que todas as tarefas pertencem ao cronograma
    const taskIdSet = new Set(tasks.map((t) => t.id));
    for (const { taskId } of tasksOrder) {
      if (!taskIdSet.has(taskId)) {
        throw new BadRequestException(
          `Tarefa com ID ${taskId} não pertence ao projeto ${schedule.projectId}`,
        );
      }
    }

    // Atualiza a ordem de cada tarefa
    for (const { taskId, newOrder } of tasksOrder) {
      await this.taskRepository.update(taskId, { order: newOrder });
    }

    // Agrupa tarefas por desenvolvedor para recalcular
    const affectedAssignees = new Set<number>();
    for (const task of tasks) {
      affectedAssignees.add(task.assigneeId);
    }

    // Recalcula todas as tarefas de cada desenvolvedor afetado
    for (const assigneeId of affectedAssignees) {
      await this.recalculateAllTasksOfAssignee(assigneeId, schedule.projectId);
    }

    // Retorna todas as tarefas atualizadas do cronograma
    return this.findTasksBySchedule(scheduleId);
  }

  /**
   * Reordena as tarefas de um projeto diretamente
   * @param projectId ID do projeto
   * @param tasksOrder Array com taskId e newOrder
   */
  async reorderTasksByProject(
    projectId: number,
    tasksOrder: { taskId: number; newOrder: number }[],
  ): Promise<Task[]> {
    try {
      const tasks = await this.taskRepository.find({
        where: { projectId },
        relations: ['project', 'assignee'],
      });

      if (tasks.length === 0) {
        throw new NotFoundException(
          `Nenhuma tarefa encontrada para o projeto ${projectId}`,
        );
      }

      const taskIdSet = new Set(tasks.map((t) => t.id));
      for (const { taskId } of tasksOrder) {
        if (!taskIdSet.has(taskId)) {
          throw new BadRequestException(
            `Tarefa com ID ${taskId} não pertence ao projeto ${projectId}`,
          );
        }
      }

      for (const { taskId, newOrder } of tasksOrder) {
        await this.taskRepository.update(taskId, { order: newOrder });
      }
      const affectedAssignees = new Set<number>();
      for (const task of tasks) {
        affectedAssignees.add(task.assigneeId);
      }
      for (const assigneeId of affectedAssignees) {
        await this.recalculateAllTasksOfAssignee(assigneeId, projectId);
      }
      await this.updateProjectActualExpectedEndDate(projectId);
      const updatedTasks = await this.taskRepository.find({
        where: { projectId },
        relations: ['assignee', 'dependencies', 'dependencies.dependsOn'],
        order: { order: 'ASC', startDate: 'ASC' },
      });
      return updatedTasks;
    } catch (error) {
      throw error;
    }
  }

  async forceRecalculateSchedule(scheduleId: number): Promise<Task[]> {
    try {
      const projectId = scheduleId;
      const tasks = await this.taskRepository.find({
        where: { projectId: projectId },
        relations: ['project', 'assignee', 'status'],
      });

      if (tasks.length === 0) {
        return [];
      }

      const assigneeIds = new Set<number>();
      for (const task of tasks) {
        assigneeIds.add(task.assigneeId);
      }

      for (const assigneeId of assigneeIds) {
        try {
          await this.recalculateAllTasksOfAssignee(assigneeId, projectId);
        } catch (error) {
          throw error;
        }
      }

      const updatedTasks = await this.taskRepository.find({
        where: { projectId: projectId },
        relations: ['project', 'assignee', 'status', 'sprint'],
      });
      return updatedTasks;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualiza o status de backlog de uma tarefa
   * @param taskId ID da tarefa
   * @param isBacklog true para mover para backlog, false para atividades
   */
  async updateTaskBacklogStatus(
    taskId: number,
    isBacklog: boolean,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }

    task.isBacklog = isBacklog;

    if (isBacklog) {
      task.startDate = undefined;
      task.endDate = undefined;
      task.expectedStartDate = undefined;
      task.expectedEndDate = undefined;
      task.estimatedHours = undefined;
      task.actualHours = 0;
    }

    await this.taskRepository.save(task);
    await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);
    return task;
  }

  async updateTaskSprint(
    taskId: number,
    sprintId: number | null | undefined,
  ): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['project', 'assignee', 'sprint'],
      });

      if (!task) {
        throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
      }

      const originalSprintId = task.sprintId;

      console.log(`[DEBUG] updateTaskSprint - Task ID: ${taskId}, Original Sprint: ${originalSprintId}, Target Sprint: ${sprintId}`);
      console.log(`[DEBUG] Comparação: ${originalSprintId} !== ${sprintId} = ${originalSprintId !== sprintId}`);
      console.log(`[DEBUG] Tipos: originalSprintId=${typeof originalSprintId}, sprintId=${typeof sprintId}`);

      // Se está mudando de sprint, recalcular order
      if (originalSprintId !== sprintId) {
        console.log(`[DEBUG] Sprint mudou - executando reordenação`);
        if (sprintId !== null && sprintId !== undefined) {
          // Encontrar o último order da sprint de destino
          const tasksInTargetSprint = await this.taskRepository.find({
            where: { 
              projectId: task.projectId, 
              assigneeId: task.assigneeId, 
              sprintId, 
              isBacklog: false 
            },
            order: { order: 'DESC' }
          });

          let insertOrder: number;
          
          if (tasksInTargetSprint.length === 0) {
            // Sprint vazia - usar order 0
            insertOrder = 0;
          } else {
            // Inserir após a última tarefa da sprint de destino
            const lastTaskOrder = tasksInTargetSprint[0].order ?? 0;
            insertOrder = lastTaskOrder + 1;
          }

          console.log(`[DEBUG] insertOrder calculado: ${insertOrder}, tarefas na sprint destino: ${tasksInTargetSprint.length}`);

          // Ajustar todas as tarefas que vêm depois do ponto de inserção
          const updateResult = await this.taskRepository
            .createQueryBuilder()
            .update(Task)
            .set({ order: () => 'order + 1' })
            .where('projectId = :projectId', { projectId: task.projectId })
            .andWhere('assigneeId = :assigneeId', { assigneeId: task.assigneeId })
            .andWhere('order >= :insertOrder', { insertOrder })
            .andWhere('id != :taskId', { taskId: task.id })
            .andWhere('isBacklog = false')
            .execute();

          console.log(`[DEBUG] Tarefas ajustadas: ${updateResult.affected}, definindo order da tarefa para: ${insertOrder}`);
          task.order = insertOrder;
        }
      }

      // Corrigir: usar undefined para desvincular sprint (conforme tipagem da entidade)
      task.sprintId = sprintId === null ? undefined : sprintId;
      
      try {
        await this.taskRepository.save(task);
      } catch (error) {
        throw error;
      }

      // Não executar compactTaskOrders aqui pois nossa lógica já organizou corretamente
      // await this.compactTaskOrders(task.projectId, task.assigneeId);
      await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);

      // Retornar a task atualizada
      return task;
    } catch (error) {
      throw error;
    }
  }

  async forceRecalculateAssignee(
    scheduleId: number,
    assigneeId: number,
  ): Promise<{ message: string; tasksCount: number }> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new NotFoundException(
        `Cronograma com ID ${scheduleId} não encontrado`,
      );
    }

    await this.compactTaskOrders(schedule.projectId, assigneeId);
    await this.recalculateAllTasksOfAssignee(assigneeId, schedule.projectId);

    const tasks = await this.taskRepository.find({
      where: { projectId: schedule.projectId, assigneeId, isBacklog: false },
      order: { order: 'ASC' },
    });

    return {
      message: `Recálculo concluído para ${tasks.length} tarefas`,
      tasksCount: tasks.length,
    };
  }

  async forceRecalculateTask(taskId: number) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }

    // Recalcula todas as tarefas do desenvolvedor
    await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);

    // Busca a tarefa atualizada
    const updatedTask = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'assignee'],
    });

    return {
      message: `Recálculo concluído para tarefa ${taskId}`,
      task: {
        id: updatedTask!.id,
        title: updatedTask!.title,
        startDate: updatedTask!.startDate,
        endDate: updatedTask!.endDate,
        expectedStartDate: updatedTask!.expectedStartDate,
        expectedEndDate: updatedTask!.expectedEndDate,
        sprintId: updatedTask!.sprintId,
        estimatedHours: updatedTask!.estimatedHours,
        actualHours: updatedTask!.actualHours,
      },
    };
  }

  private async compactTaskOrders(
    projectId: number,
    assigneeId: number,
  ): Promise<void> {
    const tasks = await this.taskRepository.find({
      where: { projectId, assigneeId, isBacklog: false },
      order: { order: 'ASC', id: 'ASC' }, // Adiciona ID para garantir ordem determinística
    });

    // Verifica se há duplicações ou gaps na sequência
    const orderValues = tasks.map(t => t.order);
    const hasDuplicates = orderValues.length !== new Set(orderValues).size;
    const hasGaps = orderValues.some((order, index) => order !== index);

    if (hasDuplicates || hasGaps) {
      // Reordena todas as tarefas sequencialmente
      for (let i = 0; i < tasks.length; i++) {
        tasks[i].order = i;
        await this.taskRepository.save(tasks[i]);
      }
    }
  }

  /**
   * Reorganiza as atividades colocando TODAS as concluídas primeiro ao concluir uma Sprint
   * Considera todas as sprints concluídas, não apenas a atual
   * @param sprintId ID da sprint concluída
   */
  async reorderTasksAfterSprintCompletion(sprintId: number): Promise<{ reorderedCount: number; details: any[] }> {
    // Busca a sprint para obter o projectId
    const sprint = await this.sprintRepository.findOne({
      where: { id: sprintId },
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint com ID ${sprintId} não encontrada`);
    }

    // Busca todas as tarefas do projeto (não só da sprint) com suas sprints
    const allTasks = await this.taskRepository.find({
      where: { projectId: sprint.projectId, isBacklog: false },
      relations: ['assignee', 'status', 'sprint'],
      order: { assigneeId: 'ASC', order: 'ASC' }
    });

    const tasksByAssignee = new Map<number, typeof allTasks>();
    allTasks.forEach(task => {
      if (!tasksByAssignee.has(task.assigneeId)) {
        tasksByAssignee.set(task.assigneeId, []);
      }
      tasksByAssignee.get(task.assigneeId)!.push(task);
    });

    let totalReordered = 0;
    const details: any[] = [];

    for (const [assigneeId, assigneeTasks] of tasksByAssignee) {
      // Separar atividades concluídas e não concluídas
      const completedTasks = assigneeTasks.filter(task => task.status.code === 'completed');
      const incompleteTasks = assigneeTasks.filter(task => task.status.code !== 'completed');

      // Se há tanto concluídas quanto não concluídas, reorganizar
      if (completedTasks.length > 0 && incompleteTasks.length > 0) {
        // Ordenar concluídas por order original (ordem de conclusão no cronograma)
        completedTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        // Ordenar não concluídas por order original 
        incompleteTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        
        // Reorganizar: TODAS as concluídas primeiro, depois as não concluídas
        const reorderedTasks = [...completedTasks, ...incompleteTasks];
        
        details.push({
          assigneeId,
          assigneeName: assigneeTasks[0].assignee.name,
          completedCount: completedTasks.length,
          incompleteCount: incompleteTasks.length,
          reorderedTasks: reorderedTasks.length,
          completedFromMultipleSprints: [...new Set(completedTasks.map(t => t.sprint?.name).filter(Boolean))].length > 1
        });

        // Atualizar order sequencialmente
        for (let i = 0; i < reorderedTasks.length; i++) {
          const task = reorderedTasks[i];
          if (task.order !== i) {
            task.order = i;
            await this.taskRepository.save(task);
            totalReordered++;
          }
        }

        // Recalcular datas após reordenação
        await this.recalculateAllTasksOfAssignee(assigneeId, sprint.projectId);
      }
    }

    return { reorderedCount: totalReordered, details };
  }

  /**
   * Detecta e corrige duplicações de order para todos os usuários de um projeto
   * @param projectId ID do projeto
   */
  async fixDuplicateOrders(projectId: number): Promise<{ fixed: number; details: any[] }> {
    // Busca todas as tarefas do projeto agrupadas por assignee
    const tasks = await this.taskRepository.find({
      where: { projectId, isBacklog: false },
      relations: ['assignee'],
      order: { assigneeId: 'ASC', order: 'ASC', id: 'ASC' }
    });

    const tasksByAssignee = new Map<number, typeof tasks>();
    tasks.forEach(task => {
      if (!tasksByAssignee.has(task.assigneeId)) {
        tasksByAssignee.set(task.assigneeId, []);
      }
      tasksByAssignee.get(task.assigneeId)!.push(task);
    });

    let totalFixed = 0;
    const details: any[] = [];

    for (const [assigneeId, assigneeTasks] of tasksByAssignee) {
      const orders = assigneeTasks.map(t => t.order ?? 0);
      const hasDuplicates = orders.length !== new Set(orders).size;
      
      if (hasDuplicates) {
        const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index);
        
        details.push({
          assigneeId,
          assigneeName: assigneeTasks[0].assignee.name,
          duplicateOrders: [...new Set(duplicateOrders)],
          tasksFixed: assigneeTasks.length
        });

        // Reordena as tarefas deste usuário
        for (let i = 0; i < assigneeTasks.length; i++) {
          assigneeTasks[i].order = i;
          await this.taskRepository.save(assigneeTasks[i]);
        }
        
        totalFixed += assigneeTasks.length;

        // Recalcula as datas após corrigir o order
        await this.recalculateAllTasksOfAssignee(assigneeId, projectId);
      }
    }

    return { fixed: totalFixed, details };
  }

  /**
   * Calcula e atualiza o actualExpectedEndDate do projeto baseado na última tarefa
   * @param projectId ID do projeto
   */
  private async updateProjectActualExpectedEndDate(
    projectId: number,
  ): Promise<void> {
    try {
      // Busca todas as tarefas do projeto que não estão no backlog
      const tasks = await this.taskRepository.find({
        where: { projectId, isBacklog: false },
        order: { endDate: 'DESC' },
      });

      if (tasks.length === 0) {
        return;
      }

      // Encontra a data de fim mais tardia entre as tarefas
      let latestEndDate: Date | null = null;

      for (const task of tasks) {
        if (task.endDate) {
          const taskEndDate = new Date(task.endDate);
          if (!latestEndDate || taskEndDate > latestEndDate) {
            latestEndDate = taskEndDate;
          }
        }
      }

      if (latestEndDate) {
        await this.scheduleRepository.manager
          .getRepository('Project')
          .update(projectId, {
            actualExpectedEndDate: latestEndDate,
          });
      }
    } catch (error) {
      console.error(
        `[ERROR] Erro ao atualizar actualExpectedEndDate para projeto ${projectId}:`,
        error,
      );
    }
  }

  /**
   * Valida se um projeto existe
   */
  async validateProject(projectId: number): Promise<Project | null> {
    return await this.projectRepository.findOne({
      where: { id: projectId },
    });
  }
}
