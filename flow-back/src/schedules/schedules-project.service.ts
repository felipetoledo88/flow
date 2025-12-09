import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThan, LessThan } from 'typeorm';
import { Task, TaskStatusEnum } from './entities/task.entity';
import { TaskStatus } from './entities/task-status.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskHoursHistory } from './entities/task-hours-history.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  DateCalculatorService,
  WorkCapacity,
} from './services/date-calculator.service';
import { TeamsService } from '../teams/teams.service';
import { SprintsService } from '../sprints/sprints.service';
import { Project } from '../projects/entities/project.entity';
import { SchedulesService } from './schedules.service';

@Injectable()
export class SchedulesProjectService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskStatus)
    private readonly taskStatusRepository: Repository<TaskStatus>,
    @InjectRepository(TaskDependency)
    private readonly dependencyRepository: Repository<TaskDependency>,
    @InjectRepository(TaskHoursHistory)
    private readonly hoursHistoryRepository: Repository<TaskHoursHistory>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dateCalculatorService: DateCalculatorService,
    private readonly teamsService: TeamsService,
    private readonly sprintsService: SprintsService,
    private readonly schedulesService: SchedulesService,
  ) {}

  private async getDefaultStatusId(): Promise<number> {
    const todoStatus = await this.taskStatusRepository.findOne({
      where: { code: TaskStatusEnum.TODO },
    });
    return todoStatus?.id || 1;
  }

  private getTeamIdFromProject(project: Project): number | null {
    if (!project.team?.id) {
      return null;
    }
    return project.team.id;
  }

  private parseDateToUTC(dateInput: Date | string): Date {
    if (dateInput instanceof Date) {
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

  async createTask(
    projectId: number,
    createTaskDto: CreateTaskDto,
  ): Promise<Task> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['team'],
    });
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    if (createTaskDto.order === undefined) {
      const maxOrderTask = await this.taskRepository.findOne({
        where: { projectId },
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
      order: createTaskDto.order || null,
      isBacklog: createTaskDto.isBacklog || false,
      projectId,
      startDate: project.startDate,
      endDate: project.startDate,
      expectedStartDate: project.startDate,
      expectedEndDate: project.startDate,
    });

    const savedTask = await this.taskRepository.save(task);
    if (createTaskDto.assigneeId) {
      await this.recalculateAllTasksOfAssignee(
        createTaskDto.assigneeId,
        projectId,
      );
    }

    await this.updateProjectActualExpectedEndDate(projectId);
    const recalculatedTask = await this.taskRepository.findOne({
      where: { id: savedTask.id },
      relations: [
        'project',
        'assignee',
        'dependencies',
        'dependents',
        'status',
      ],
    });
    if (!recalculatedTask) {
      throw new NotFoundException('Tarefa não encontrada após recálculo');
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
        'project.team',
        'assignee',
        'dependencies',
        'dependents',
        'status',
      ],
    });

    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }

    const oldAssigneeId = task.assigneeId;
    const assigneeChanged = updateTaskDto.assigneeId && updateTaskDto.assigneeId != oldAssigneeId;

    if (assigneeChanged) {
      task.assigneeId = updateTaskDto.assigneeId!;
      delete (task as any).assignee;
    }
    if (updateTaskDto.statusId) {
      task.statusId = updateTaskDto.statusId;
      delete (task as any).status;
    }
    if (updateTaskDto.sprintId != undefined && task.sprintId != updateTaskDto.sprintId) {
      await this.updateTaskSprint(task.id, updateTaskDto.sprintId!);
    }

    Object.assign(task, updateTaskDto);

    if (task.isBacklog){
      await this.updateTaskBacklogStatus(task.id, updateTaskDto.isBacklog!);
    }

    if (assigneeChanged && !task.isBacklog) {
      const maxOrderTask = await this.taskRepository.findOne({
        where: { 
          projectId: task.projectId, 
          assigneeId: task.assigneeId, 
          isBacklog: false 
        },
          order: { order: 'DESC' },
      });

      const newOrder = maxOrderTask && maxOrderTask.order !== null ? maxOrderTask.order + 1 : 1;

      await this.taskRepository.update(task.id, { order: newOrder });
      await this.recalculateAllTasksOfAssignee(task.projectId, task.assigneeId);
      task.order = newOrder;
      await this.taskRepository.save(task);
      await this.reorderAllTasksSequentially(task.projectId, oldAssigneeId);
      await this.recalculateAllTasksOfAssignee(task.projectId, task.assigneeId);

      const reloadedTask = await this.taskRepository.findOne({
        where: { id: task.id },
        relations: ['project', 'assignee']
      });

      if (reloadedTask) {
        task.startDate = reloadedTask.startDate;
        task.endDate = reloadedTask.endDate;
        task.expectedStartDate = reloadedTask.expectedStartDate;
        task.expectedEndDate = reloadedTask.expectedEndDate;
      }
    }

    await this.updateProjectActualExpectedEndDate(task.projectId);
    await this.taskRepository.save(task);

    const updatedTask = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: [
        'project',
        'assignee',
        'dependencies',
        'dependents',
        'status',
      ],
    });

    if (!updatedTask) {
      throw new NotFoundException('Tarefa atualizada não encontrada');
    }
    return updatedTask;
  }

  async findTasksByProject(projectId: number): Promise<Task[]> {
    return this.taskRepository.find({
      where: { projectId },
      relations: [
        'assignee',
        'dependencies',
        'dependencies.dependsOn',
        'status',
      ],
      order: { order: 'ASC', startDate: 'ASC' },
    });
  }

  async removeTask(taskId: number): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task) {
      throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
    }

    const assigneeId = task.assigneeId;
    const projectId = task.projectId;

    await this.taskRepository.softDelete(task.id);
    await this.taskRepository.update(task.id, { order: null, isBacklog: true });
    await this.reorderAllTasksSequentially(projectId, assigneeId);
    await this.taskRepository.update(task.id, { order: null, isBacklog: true });
  }

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
      task.order = null
    }

    await this.recalculateAllTasksOfAssignee(task.assigneeId, task.projectId);
    await this.updateProjectActualExpectedEndDate(task.projectId);
    await this.taskRepository.save(task);
    return task;
  }

  private async calculateOrderForEmptySprint(
    projectId: number, 
    assigneeId: number, 
    targetSprintId: number, 
    excludeTaskId: number
  ): Promise<number> {
    const tasksInTargetSprint = await this.taskRepository.find({
      where: { 
        projectId, 
        assigneeId, 
        isBacklog: false,
        sprintId: targetSprintId,
        id: Not(excludeTaskId)
      },
      order: { order: 'DESC' }
    });

    if (tasksInTargetSprint.length > 0) {
      const lastOrderInTargetSprint = tasksInTargetSprint[0].order ?? 0;
      const insertOrder = lastOrderInTargetSprint + 1;
      const tasksInLaterSprints = await this.taskRepository.find({
        where: { 
          projectId, 
          assigneeId, 
          isBacklog: false,
          sprintId: MoreThan(targetSprintId),
          id: Not(excludeTaskId)
        },
        order: { order: 'ASC' }
      });

      if (tasksInLaterSprints.length > 0) {
        await this.taskRepository
          .createQueryBuilder()
          .update(Task)
          .set({ order: () => '"order" + 1' })
          .where('projectId = :projectId', { projectId })
          .andWhere('assigneeId = :assigneeId', { assigneeId })
          .andWhere('sprintId > :targetSprintId', { targetSprintId })
          .andWhere('id != :excludeTaskId', { excludeTaskId })
          .andWhere('isBacklog = false')
          .execute();
      }

      return insertOrder;
    }

    // Se a sprint de destino está vazia, buscar a maior ordem das sprints anteriores
    const lastOrderFromPreviousSprints = await this.taskRepository
      .createQueryBuilder('task')
      .select('MAX(task.order)', 'maxOrder')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.assigneeId = :assigneeId', { assigneeId })
      .andWhere('task.isBacklog = false')
      .andWhere('task.sprintId IS NOT NULL')
      .andWhere('task.sprintId < :targetSprintId', { targetSprintId })
      .andWhere('task.id != :excludeTaskId', { excludeTaskId })
      .getRawOne();

    const lastOrder = lastOrderFromPreviousSprints?.maxOrder ? 
      parseInt(lastOrderFromPreviousSprints.maxOrder) : 0;
    const tasksInLaterSprints = await this.taskRepository.find({
      where: { 
        projectId, 
        assigneeId, 
        isBacklog: false,
        sprintId: MoreThan(targetSprintId),
        id: Not(excludeTaskId)
      },
      order: { order: 'ASC' }
    });

    const insertOrder = lastOrder + 1;

    if (tasksInLaterSprints.length > 0) {
      await this.taskRepository
        .createQueryBuilder()
        .update(Task)
        .set({ order: () => '"order" + 1' })
        .where('projectId = :projectId', { projectId })
        .andWhere('assigneeId = :assigneeId', { assigneeId })
        .andWhere('sprintId > :targetSprintId', { targetSprintId })
        .andWhere('id != :excludeTaskId', { excludeTaskId })
        .andWhere('isBacklog = false')
        .execute();
    }
    return insertOrder;
  }

  async reorderAllTasksSequentially(projectId: number, assigneeId: number): Promise<void> {
    const allTasks = await this.taskRepository.find({
      where: { 
        projectId, 
        assigneeId, 
        isBacklog: false 
      },
      order: { order: 'ASC' }
    });

    let currentOrder = 1;
    const updatedTasks: any[] = [];
    
    for (const task of allTasks) {
      if (task.order != currentOrder) {
        await this.taskRepository
          .createQueryBuilder()
          .update(Task)
          .set({ order: currentOrder })
          .where('id = :taskId', { taskId: task.id })
          .execute();
        await this.recalculateAllTasksOfAssignee(projectId, assigneeId);
        await this.schedulesService.forceRecalculateSchedule(projectId);
        await this.taskRepository.findOne({
          where: { id: task.id }
        });
        updatedTasks.push({ taskId: task.id, oldOrder: task.order, newOrder: currentOrder });
      } else {
        await this.recalculateAllTasksOfAssignee(projectId, assigneeId);
        await this.schedulesService.forceRecalculateSchedule(projectId);
        await this.taskRepository.findOne({
          where: { id: task.id }
        });
      }
      currentOrder++;
    }
  }

  async updateTaskSprint(
    taskId: number,
    sprintId: number | null,
  ): Promise<Task> {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['project', 'assignee', 'sprint'],
      });

      if (!task) {
        console.error('Tarefa não encontrada')
        throw new NotFoundException(`Tarefa com ID ${taskId} não encontrada`);
      }

      const originalSprintId = task.sprintId;
      let insertOrder: number | null = task.order;

      if (originalSprintId !== sprintId) {
        await this.taskRepository.find({
          where: { 
            projectId: task.projectId, 
            assigneeId: task.assigneeId, 
            isBacklog: false 
          },
          order: { order: 'ASC' }
        });

        const originalOrder = task.order ?? 0;
        
        await this.taskRepository
          .createQueryBuilder()
          .update(Task)
          .set({ order: () => '"order" - 1' })
          .where('projectId = :projectId', { projectId: task.projectId })
          .andWhere('assigneeId = :assigneeId', { assigneeId: task.assigneeId })
          .andWhere('sprintId = :sprintId', { sprintId })
          .andWhere('"order" > :originalOrder', { originalOrder })
          .andWhere('id != :taskId', { taskId: task.id })
          .andWhere('isBacklog = false')
          .execute();
        await this.taskRepository.find({
          where: { 
            projectId: task.projectId, 
            assigneeId: task.assigneeId, 
            isBacklog: false 
          },
          order: { order: 'ASC' }
        });

        if (sprintId) {
          insertOrder = await this.calculateOrderForEmptySprint(
            task.projectId, 
            task.assigneeId, 
            sprintId, 
            taskId
          );
        } else {
          insertOrder = null;
        }
      }

      await this.taskRepository
        .createQueryBuilder()
        .update(Task)
        .set({ sprintId: sprintId!, order: insertOrder })
        .where('id = :taskId', { taskId: task.id })
        .execute();

      task.sprintId = sprintId!;
      task.order = insertOrder;

      await this.reorderAllTasksSequentially(task.projectId, task.assigneeId);
      await this.recalculateTasksForAssignee(task.projectId, task.assigneeId);
      await this.updateProjectActualExpectedEndDate(task.projectId);

      const taskAfterSave = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['sprint'],
      });
      return taskAfterSave!;
    } catch (error) {
      throw error;
    }
  }

  async recalculateTasksForAssignee(
    assigneeId: number,
    projectId: number,
  ): Promise<void> {
    return this.recalculateAllTasksOfAssignee(assigneeId, projectId);
  }

  private async recalculateAllTasksOfAssignee(
    projectId: number,
    assigneeId: number,
  ): Promise<void> {
    const tasks = await this.taskRepository.find({
      where: { projectId, assigneeId, isBacklog: false },
      relations: ['project', 'project.team', 'assignee'],
      order: { order: 'ASC' },
    });
    if (tasks.length === 0) {
      return;
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['team'],
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    const teamId = this.getTeamIdFromProject(project);
    if (!teamId) {
      throw new BadRequestException('Projeto deve ter uma equipe atribuída');
    }

    const teamMember = await this.teamsService.findMemberByUserId(
      teamId,
      assigneeId,
    );

    const workCapacity =
      this.dateCalculatorService.getWorkCapacityFromTeamMember(teamMember);

    const initialDate = project.startDate
      ? this.parseDateToUTC(project.startDate)
      : new Date();

    const firstWorkDay = new Date(initialDate);
    while (!workCapacity.workDays.includes(firstWorkDay.getUTCDay())) {
      firstWorkDay.setUTCDate(firstWorkDay.getUTCDate() + 1);
    }

    const calendar: Array<{
      date: Date;
      availableHours: number;
      usedHours: number;
    }> = [
      {
        date: firstWorkDay,
        availableHours: workCapacity.dailyWorkHours,
        usedHours: 0,
      },
    ];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const hoursToOccupyInCalendar =
        Number(task.actualHours) > 0
          ? Number(task.actualHours)
          : Number(task.estimatedHours);
      const { startDate, endDate } = this.allocateHoursInCalendar(
        calendar,
        hoursToOccupyInCalendar,
        workCapacity,
      );

      task.startDate = this.dateToString(startDate) as any;
      task.endDate = this.dateToString(endDate) as any;
      task.expectedStartDate = this.dateToString(startDate) as any;

      const expectedEndDate = this.dateCalculatorService.calculateEndDate(
        startDate,
        Number(task.estimatedHours),
        workCapacity,
      );

      task.expectedEndDate = this.dateToString(expectedEndDate) as any;
      await this.taskRepository.save(task);
    }
  }

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

  async reorderTasks(
    projectId: number,
    tasksOrder: { taskId: number; newOrder: number }[],
  ): Promise<Task[]> {
    const tasks = await this.taskRepository.find({
      where: { projectId },
      relations: ['project', 'assignee'],
    });

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
      if (task.assigneeId) {
        affectedAssignees.add(task.assigneeId);
      }
    }

    for (const assigneeId of affectedAssignees) {
      await this.recalculateAllTasksOfAssignee(assigneeId, projectId);
    }

    await this.updateProjectActualExpectedEndDate(projectId);
    return this.findTasksByProject(projectId);
  }

  /**
   * @param projectId ID do projeto
   */
  private async updateProjectActualExpectedEndDate(
    projectId: number,
  ): Promise<void> {
    try {
      const tasks = await this.taskRepository.find({
        where: { projectId, isBacklog: false },
        order: { endDate: 'DESC' },
      });

      if (tasks.length === 0) {
        return;
      }

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
        await this.projectRepository.update(projectId, {
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
}
