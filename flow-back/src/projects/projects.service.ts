import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import {
  Project,
  ProjectStatus,
  ProjectHealth,
  ProjectPriority,
} from './entities/project.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import {
  ProjectResponse,
  PaginatedProjectsResponse,
  ProjectStatsResponse,
} from './interfaces/project-response.interface';
import { UsersService } from '../users/users.service';
import { Sprint } from '../common/entities/sprint.entity';
import { Task } from '../schedules/entities/task.entity';
import { SchedulesProjectService } from '../schedules/schedules-project.service';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Sprint)
    private sprintsRepository: Repository<Sprint>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private usersService: UsersService,
    private schedulesProjectService: SchedulesProjectService,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
  ) {}

  async findAll(
    queryDto: QueryProjectDto,
    userId?: number,
    userRole?: string,
  ): Promise<PaginatedProjectsResponse> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      health,
      priority,
      director,
      manager,
      orderBy = 'createdAt',
      order = 'DESC',
    } = queryDto;

    const skip = (page - 1) * limit;

    // Para admin, buscar todos os projetos normalmente
    if (userRole === 'admin') {
      const where: FindOptionsWhere<Project> = {};

      if (search) {
        where.name = Like(`%${search}%`);
      }

      if (status) {
        where.status = status;
      }

      if (health) {
        where.health = health;
      }

      if (priority) {
        where.priority = priority;
      }

      if (director) {
        // Filtrar por diretor através da equipe
        if (!where.team) {
          where.team = {};
        }

        (where.team as any).director = { id: director };
      }

      if (manager) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where.manager = { id: manager } as any;
      }

      const [projects, total] = await this.projectsRepository.findAndCount({
        where,
        skip,
        take: limit,
        order: { [orderBy]: order },
        relations: ['manager', 'clients', 'team', 'team.director'],
      });


      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        projects: projects.map((project) => this.mapToProjectResponse(project)),
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev,
      };
    }

    // Para usuários não-admin, filtrar apenas projetos das equipes onde estão vinculados
    const queryBuilder = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.manager', 'manager')
      .leftJoinAndSelect('project.clients', 'clients')
      .leftJoinAndSelect('project.team', 'team')
      .leftJoinAndSelect('team.director', 'director')
      .leftJoinAndSelect('team.members', 'members')
      .where('(director.id = :userId OR members.user_id = :userId)', {
        userId,
      });

    if (search) {
      queryBuilder.andWhere('project.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    if (health) {
      queryBuilder.andWhere('project.health = :health', { health });
    }

    if (priority) {
      queryBuilder.andWhere('project.priority = :priority', { priority });
    }

    if (director) {
      queryBuilder.andWhere('team.director_id = :director', { director });
    }

    if (manager) {
      queryBuilder.andWhere('project.manager_id = :manager', { manager });
    }

    queryBuilder.orderBy(`project.${orderBy}`, order).skip(skip).take(limit);

    const [projects, total] = await queryBuilder.getManyAndCount();


    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      projects: projects.map((project) => this.mapToProjectResponse(project)),
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  // Método interno (sem filtro de permissão) - para uso dentro do service
  private async findByIdInternal(id: number): Promise<Project | null> {
    return this.projectsRepository.findOne({
      where: { id },
      relations: [
        'manager',
        'clients',
        'team',
        'team.director',
        'team.members',
      ],
    });
  }

  // Método público (com filtro de permissão) - para uso via API
  async findById(
    id: number,
    userId?: number,
    userRole?: string,
  ): Promise<Project | null> {
    const project = await this.findByIdInternal(id);

    if (!project) {
      return null;
    }

    // Para usuários não-admin, verificar se tem acesso ao projeto
    if (userRole !== 'admin' && userId) {
      const hasAccess =
        project.team?.director?.id === userId ||
        project.team?.members?.some((member) => member.userId === userId);

      if (!hasAccess) {
        return null; // Retorna null se não tem acesso
      }
    }

    return project;
  }

  async getProjectAsSchedule(
    id: number,
    userId?: number,
    userRole?: string,
  ): Promise<any> {
    // Buscar o projeto com todas as relações necessárias
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: [
        'manager',
        'clients',
        'team',
        'team.director',
        'team.members',
        'team.members.user',
      ],
    });

    if (!project) {
      return null;
    }

    // Para usuários não-admin, verificar se tem acesso ao projeto
    if (userRole !== 'admin' && userId) {
      const hasAccess =
        project.team?.director?.id === userId ||
        project.team?.members?.some((member) => member.userId === userId);

      if (!hasAccess) {
        return null; // Retorna null se não tem acesso (como se o projeto não existisse)
      }
    }

    // Buscar tarefas que referenciam este projeto diretamente
    const tasks = await this.schedulesProjectService.findTasksByProject(id);

    // Formatar resposta como se fosse um cronograma, mas usando apenas dados do projeto
    return {
      id: project.id, // Usa o ID do projeto como ID do cronograma
      name: project.name, // Nome do cronograma = nome do projeto
      description:
        project.description || `Cronograma do projeto ${project.name}`,
      projectId: project.id,
      project: project,
      team: project.team,
      status: 'planning', // Status padrão
      startDate: project.startDate,
      expectedEndDate: project.actualExpectedEndDate || project.endDate, // Usa actualExpectedEndDate se disponível
      tasks: tasks, // Tarefas vinculadas diretamente ao projeto
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      isDeleted: false,
    };
  }

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    let team: any = undefined;
    if (createProjectDto.teamId) {
      team = await this.teamsService.findOne(createProjectDto.teamId);
      if (!team) {
        throw new NotFoundException('Equipe não encontrada');
      }
    }

    let manager: User | undefined = undefined;
    if (createProjectDto.manager) {
      const managerUser = await this.usersService.findById(
        createProjectDto.manager,
      );
      if (!managerUser) {
        throw new NotFoundException('Manager não encontrado');
      }
      manager = managerUser;
    }

    const project = new Project();
    project.name = createProjectDto.name;
    project.description = createProjectDto.description;
    project.status = createProjectDto.status || ProjectStatus.ACTIVE;
    project.health = createProjectDto.health || ProjectHealth.HEALTHY;
    project.priority = createProjectDto.priority || ProjectPriority.MEDIUM;
    project.startDate = createProjectDto.startDate
      ? new Date(createProjectDto.startDate + 'T23:59:59.999Z')
      : undefined;
    project.endDate = createProjectDto.endDate
      ? new Date(createProjectDto.endDate + 'T23:59:59.999Z')
      : undefined;
    project.settings = createProjectDto.settings || {};
    project.team = team;
    project.manager = manager;
    project.clients = [];

    const savedProject = await this.projectsRepository.save(project);
    return savedProject;
  }

  async update(
    id: number,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findByIdInternal(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    let team: any = undefined;
    if (updateProjectDto.teamId) {
      team = await this.teamsService.findOne(updateProjectDto.teamId);
      if (!team) {
        throw new NotFoundException('Equipe não encontrada');
      }
    }

    let manager: User | undefined = undefined;
    if (updateProjectDto.manager) {
      const managerUser = await this.usersService.findById(
        updateProjectDto.manager,
      );
      if (!managerUser) {
        throw new NotFoundException('Manager não encontrado');
      }
      manager = managerUser;
    }

    if (updateProjectDto.name !== undefined)
      project.name = updateProjectDto.name;
    if (updateProjectDto.description !== undefined)
      project.description = updateProjectDto.description;
    if (updateProjectDto.status !== undefined)
      project.status = updateProjectDto.status;
    if (updateProjectDto.health !== undefined)
      project.health = updateProjectDto.health;
    if (updateProjectDto.priority !== undefined)
      project.priority = updateProjectDto.priority;

    // Verificar se a data de início foi alterada para recalcular tarefas
    const startDateChanged = updateProjectDto.startDate !== undefined;
    const oldStartDate = project.startDate;

    if (updateProjectDto.startDate !== undefined) {
      project.startDate =
        updateProjectDto.startDate && updateProjectDto.startDate.trim()
          ? new Date(updateProjectDto.startDate + 'T23:59:59.999Z')
          : undefined;
    }

    if (updateProjectDto.endDate !== undefined) {
      project.endDate =
        updateProjectDto.endDate && updateProjectDto.endDate.trim()
          ? new Date(updateProjectDto.endDate + 'T23:59:59.999Z')
          : undefined;
    }
    if (updateProjectDto.actualExpectedEndDate !== undefined) {
      project.actualExpectedEndDate =
        updateProjectDto.actualExpectedEndDate &&
        updateProjectDto.actualExpectedEndDate.trim()
          ? new Date(updateProjectDto.actualExpectedEndDate + 'T23:59:59.999Z')
          : undefined;
    }

    if (updateProjectDto.settings !== undefined)
      project.settings = updateProjectDto.settings;
    if (team !== undefined) project.team = team;
    if (manager !== undefined) project.manager = manager;

    if (updateProjectDto.clientIds !== undefined) {
      const clientUsers = await this.usersService.findByIds(
        updateProjectDto.clientIds.map((id) => parseInt(id)),
      );
      const nonClients = clientUsers.filter(
        (user) => user.role !== UserRole.CLIENT,
      );
      if (nonClients.length > 0) {
        throw new BadRequestException(
          `Os seguintes usuários não são clientes: ${nonClients.map((u) => u.name).join(', ')}`,
        );
      }
      project.clients = clientUsers;
    }

    if (updateProjectDto.teamId !== undefined) {
      if (updateProjectDto.teamId) {
        const team = await this.teamsService.findOne(updateProjectDto.teamId);
        if (!team) {
          throw new NotFoundException('Equipe não encontrada');
        }
        project.team = team;
      } else {
        project.team = undefined;
      }
    }
    const updatedProject = await this.projectsRepository.save(project);

    // Se a data de início mudou, recalcular todas as tarefas do projeto
    if (
      startDateChanged &&
      project.startDate &&
      (!oldStartDate ||
        new Date(project.startDate).getTime() !==
          new Date(oldStartDate).getTime())
    ) {
      await this.recalculateAllProjectTasks(id);
    }

    return updatedProject;
  }

  /**
   * Recalcula todas as tarefas do projeto quando a data de início é alterada
   */
  private async recalculateAllProjectTasks(projectId: number): Promise<void> {
    try {
      // Buscar todas as tarefas do projeto (não backlog)
      const tasks = await this.tasksRepository.find({
        where: { projectId, isBacklog: false },
        relations: ['assignee'],
      });

      // Agrupar por desenvolvedor
      const tasksByAssignee = new Map<number, Task[]>();
      for (const task of tasks) {
        if (task.assigneeId) {
          if (!tasksByAssignee.has(task.assigneeId)) {
            tasksByAssignee.set(task.assigneeId, []);
          }
          tasksByAssignee.get(task.assigneeId)!.push(task);
        }
      }

      // Recalcular para cada desenvolvedor
      for (const [assigneeId] of tasksByAssignee) {
        await this.schedulesProjectService.recalculateTasksForAssignee(
          assigneeId,
          projectId,
        );
      }
    } catch (error) {
      console.error(
        `[ERROR] Erro ao recalcular tarefas do projeto ${projectId}:`,
        error,
      );
    }
  }

  async delete(id: number): Promise<void> {
    const project = await this.findByIdInternal(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    try {
      // Usar soft delete em cascata - ordem importante para manter integridade

      // 1. Soft delete das tasks do projeto
      await this.tasksRepository.softDelete({ projectId: id });

      // 2. Soft delete dos sprints relacionados ao projeto
      await this.sprintsRepository.softDelete({ projectId: id });

      // 3. Finalmente soft delete do projeto
      await this.projectsRepository.softDelete(id);
    } catch (error) {
      throw new BadRequestException(
        'Erro ao excluir projeto. Verifique se não há dependências não tratadas.',
      );
    }
  }

  async changeStatus(id: number, status: ProjectStatus): Promise<Project> {
    const project = await this.findByIdInternal(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.update(id, { status });
    const updatedProject = await this.findByIdInternal(id);
    if (!updatedProject) {
      throw new NotFoundException('Erro ao atualizar status do projeto');
    }
    return updatedProject;
  }

  async changeHealth(id: number, health: ProjectHealth): Promise<Project> {
    const project = await this.findByIdInternal(id);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    await this.projectsRepository.update(id, { health });
    const updatedProject = await this.findByIdInternal(id);
    if (!updatedProject) {
      throw new NotFoundException('Erro ao atualizar health do projeto');
    }
    return updatedProject;
  }

  async getStats(): Promise<ProjectStatsResponse> {
    const [
      total,
      active,
      completed,
      paused,
      cancelled,
      healthy,
      warning,
      critical,
    ] = await Promise.all([
      this.projectsRepository.count(),
      this.projectsRepository.count({
        where: { status: ProjectStatus.ACTIVE },
      }),
      this.projectsRepository.count({
        where: { status: ProjectStatus.COMPLETED },
      }),
      this.projectsRepository.count({
        where: { status: ProjectStatus.PAUSED },
      }),
      this.projectsRepository.count({
        where: { status: ProjectStatus.CANCELLED },
      }),
      this.projectsRepository.count({
        where: { health: ProjectHealth.HEALTHY },
      }),
      this.projectsRepository.count({
        where: { health: ProjectHealth.WARNING },
      }),
      this.projectsRepository.count({
        where: { health: ProjectHealth.CRITICAL },
      }),
    ]);

    return {
      total,
      active,
      completed,
      paused,
      cancelled,
      healthy,
      warning,
      critical,
    };
  }

  private mapToProjectResponse(project: Project): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      health: project.health,
      priority: project.priority,
      startDate: project.startDate
        ? typeof project.startDate === 'string'
          ? project.startDate
          : project.startDate.toISOString().split('T')[0]
        : undefined,
      endDate: project.endDate
        ? typeof project.endDate === 'string'
          ? project.endDate
          : project.endDate.toISOString().split('T')[0]
        : undefined,
      settings: project.settings,
      team: project.team
        ? {
            id: project.team.id,
            name: project.team.name,
            director: project.team.director
              ? {
                  id: project.team.director.id,
                  name: project.team.director.name,
                  email: project.team.director.email,
                }
              : null,
            members: project.team.members || [],
          }
        : null,
      manager: project.manager
        ? {
            id: project.manager.id,
            name: project.manager.name,
            email: project.manager.email,
          }
        : undefined,
      clients: project.clients
        ? project.clients.map((client) => ({
            id: client.id,
            name: client.name,
            email: client.email,
          }))
        : [],
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      lastSyncAt: project.lastSyncAt?.toISOString(),
    };
  }
}
