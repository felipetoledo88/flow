import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { ReportsFilterDto } from './dto/reports-filter.dto';
import { Task } from '../schedules/entities/task.entity';
import { TaskHoursHistory } from '../schedules/entities/task-hours-history.entity';

interface HoursGroup {
  hours: number;
  projectId?: number | null;
  projectName?: string | null;
  teamId?: number | null;
  teamName?: string | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
}

interface DelayGroup {
  delayed: number;
  onTime: number;
  total: number;
  teamId?: number | null;
  teamName?: string | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
}

interface TaskHoursItem {
  id: number;
  title: string;
  status: string;
  estimatedHours: number;
  actualHours: number;
  assigneeName?: string | null;
  teamName?: string | null;
  endDate?: Date | null;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskHoursHistory)
    private readonly historyRepository: Repository<TaskHoursHistory>,
  ) {}

  private applyFilters<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    filters: ReportsFilterDto,
  ): SelectQueryBuilder<T> {
    const { startDate, endDate, projectId, teamId, assigneeId } = filters;

    if (projectId) {
      qb.andWhere('project.id = :projectId', { projectId });
    }

    if (teamId) {
      qb.andWhere('team.id = :teamId', { teamId });
    }

    if (assigneeId) {
      qb.andWhere('task.assignee_id = :assigneeId', { assigneeId });
    }

    if (startDate) {
      qb.andWhere('history.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('history.createdAt <= :endDate', { endDate });
    }

    return qb;
  }

  private applyTaskDateFilters<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    filters: ReportsFilterDto,
  ): SelectQueryBuilder<T> {
    const { startDate, endDate, projectId, teamId, assigneeId } = filters;

    if (projectId) {
      qb.andWhere('project.id = :projectId', { projectId });
    }

    if (teamId) {
      qb.andWhere('team.id = :teamId', { teamId });
    }

    if (assigneeId) {
      qb.andWhere('task.assignee_id = :assigneeId', { assigneeId });
    }

    if (startDate) {
      qb.andWhere('task.endDate >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('task.endDate <= :endDate', { endDate });
    }

    return qb;
  }

  private normalizeDate(date?: string): string | undefined {
    if (!date) return undefined;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return undefined;
    // Ajusta para o fim do dia para incluir lançamentos
    parsed.setUTCHours(23, 59, 59, 999);
    return parsed.toISOString();
  }

  async getOverview(filters: ReportsFilterDto) {
    const normalizedFilters: ReportsFilterDto = {
      ...filters,
      startDate: filters.startDate
        ? new Date(filters.startDate).toISOString()
        : undefined,
      endDate: this.normalizeDate(filters.endDate),
    };

    const historyBaseQuery = this.historyRepository
      .createQueryBuilder('history')
      .leftJoin('history.task', 'task')
      .leftJoin('task.project', 'project')
      .leftJoin('project.team', 'team')
      .leftJoin('task.assignee', 'assignee');

    const hoursByProject = (await this.applyFilters(
      historyBaseQuery.clone(),
      normalizedFilters,
    )
      .select('task.projectId', 'projectId')
      .addSelect('project.name', 'projectName')
      .addSelect('SUM(history.hoursChanged)', 'hours')
      .groupBy('task.projectId')
      .addGroupBy('project.name')
      .orderBy('project.name', 'ASC')
      .getRawMany()) as HoursGroup[];

    const hoursByTeam = (await this.applyFilters(
      historyBaseQuery.clone(),
      normalizedFilters,
    )
      .select('team.id', 'teamId')
      .addSelect('team.name', 'teamName')
      .addSelect('SUM(history.hoursChanged)', 'hours')
      .groupBy('team.id')
      .addGroupBy('team.name')
      .orderBy('team.name', 'ASC')
      .getRawMany()) as HoursGroup[];

    const hoursByAssignee = (await this.applyFilters(
      historyBaseQuery.clone(),
      normalizedFilters,
    )
      .select('assignee.id', 'assigneeId')
      .addSelect('assignee.name', 'assigneeName')
      .addSelect('SUM(history.hoursChanged)', 'hours')
      .groupBy('assignee.id')
      .addGroupBy('assignee.name')
      .orderBy('assignee.name', 'ASC')
      .getRawMany()) as HoursGroup[];

    const totalHours = hoursByProject.reduce(
      (sum, item) => sum + Number(item.hours || 0),
      0,
    );

    // Delays by team/assignee (considera data fim prevista)
    const taskBaseQuery = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .leftJoin('project.team', 'team')
      .leftJoin('task.assignee', 'assignee')
      .leftJoin('task.status', 'status')
      .where('task.endDate IS NOT NULL');

    const delayedCondition = `("task"."endDate" IS NOT NULL AND (
      ("status"."code" = 'completed' AND "task"."updatedAt"::date > "task"."endDate")
      OR ("status"."code" != 'completed' AND NOW()::date > "task"."endDate")
    ))`;

    const delaysByTeam = (await this.applyTaskDateFilters(
      taskBaseQuery.clone(),
      normalizedFilters,
    )
      .select('team.id', 'teamId')
      .addSelect('team.name', 'teamName')
      .addSelect(
        `SUM(CASE WHEN ${delayedCondition} THEN 1 ELSE 0 END)`,
        'delayed',
      )
      .addSelect(
        `SUM(CASE WHEN ${delayedCondition} THEN 0 ELSE 1 END)`,
        'onTime',
      )
      .addSelect('COUNT(task.id)', 'total')
      .groupBy('team.id')
      .addGroupBy('team.name')
      .orderBy('team.name', 'ASC')
      .getRawMany()) as DelayGroup[];

    const delaysByAssignee = (await this.applyTaskDateFilters(
      taskBaseQuery.clone(),
      normalizedFilters,
    )
      .select('assignee.id', 'assigneeId')
      .addSelect('assignee.name', 'assigneeName')
      .addSelect(
        `SUM(CASE WHEN ${delayedCondition} THEN 1 ELSE 0 END)`,
        'delayed',
      )
      .addSelect(
        `SUM(CASE WHEN ${delayedCondition} THEN 0 ELSE 1 END)`,
        'onTime',
      )
      .addSelect('COUNT(task.id)', 'total')
      .groupBy('assignee.id')
      .addGroupBy('assignee.name')
      .orderBy('assignee.name', 'ASC')
      .getRawMany()) as DelayGroup[];

    const tasksWithHours = await this.applyTaskDateFilters(
      taskBaseQuery.clone(),
      normalizedFilters,
    )
      .select('task.id', 'id')
      .addSelect('task.title', 'title')
      .addSelect('status.code', 'status')
      .addSelect('task.estimatedHours', 'estimatedHours')
      .addSelect('task.actualHours', 'actualHours')
      .addSelect('assignee.name', 'assigneeName')
      .addSelect('team.name', 'teamName')
      .addSelect('task.endDate', 'endDate')
      .orderBy('team.name', 'ASC')
      .addOrderBy('assignee.name', 'ASC')
      .addOrderBy('task.endDate', 'ASC')
      .getRawMany<TaskHoursItem>();

    const tasksSummary = await this.applyTaskDateFilters(
      taskBaseQuery.clone(),
      normalizedFilters,
    )
      .select('COUNT(task.id)', 'total')
      .addSelect(
        `SUM(CASE WHEN status.code = 'completed' THEN 1 ELSE 0 END)`,
        'completed',
      )
      .addSelect(
        `SUM(CASE WHEN ${delayedCondition} THEN 1 ELSE 0 END)`,
        'overdue',
      )
      .getRawOne();

    return {
      filters: normalizedFilters,
      hours: {
        total: totalHours,
        byProject: hoursByProject.map((item) => ({
          ...item,
          hours: Number(item.hours || 0),
        })),
        byTeam: hoursByTeam.map((item) => ({
          ...item,
          hours: Number(item.hours || 0),
        })),
        byAssignee: hoursByAssignee.map((item) => ({
          ...item,
          hours: Number(item.hours || 0),
        })),
      },
      delays: {
        byTeam: delaysByTeam.map((item) => ({
          ...item,
          delayed: Number(item.delayed || 0),
          onTime: Number(item.onTime || 0),
          total: Number(item.total || 0),
        })),
        byAssignee: delaysByAssignee.map((item) => ({
          ...item,
          delayed: Number(item.delayed || 0),
          onTime: Number(item.onTime || 0),
          total: Number(item.total || 0),
        })),
      },
      tasksByAssignee: tasksWithHours.reduce<Record<string, any>>((acc, task) => {
        const key = task.assigneeName || 'Sem responsável';
        if (!acc[key]) {
          acc[key] = { assigneeName: key, totalHours: 0, tasks: [] as TaskHoursItem[] };
        }
        acc[key].tasks.push(task);
        acc[key].totalHours += Number(task.actualHours || 0);
        return acc;
      }, {}),
      tasksByTeam: tasksWithHours.reduce<Record<string, any>>((acc, task) => {
        const key = task.teamName || 'Sem equipe';
        if (!acc[key]) {
          acc[key] = { teamName: key, totalHours: 0, tasks: [] as TaskHoursItem[] };
        }
        acc[key].tasks.push(task);
        acc[key].totalHours += Number(task.actualHours || 0);
        return acc;
      }, {}),
      tasks: {
        total: Number(tasksSummary?.total || 0),
        completed: Number(tasksSummary?.completed || 0),
        overdue: Number(tasksSummary?.overdue || 0),
      },
    };
  }
}
