import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { QueryProjectDto } from './dto/query-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectStatus, ProjectHealth } from './entities/project.entity';
import { ReorderTasksDto } from '../schedules/dto/reorder-tasks.dto';
import { SchedulesService } from '../schedules/schedules.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly schedulesService: SchedulesService,
  ) {}

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto) {
    const project = await this.projectsService.create(createProjectDto);
    return {
      message: 'Projeto criado com sucesso',
      project,
    };
  }

  @Get()
  async findAll(@Query() queryDto: QueryProjectDto, @Request() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userId = req?.user?.id;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userRole = req?.user?.role;

    // Para role 'client', retornar lista vazia
    if (userRole === 'client') {
      return {
        projects: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
    }

    // Para role 'manager', filtrar por diretor (compatibilidade)
    if (userRole === 'manager' && !queryDto.director) {
      queryDto.director = userId;
    }

    return this.projectsService.findAll(queryDto, userId, userRole);
  }

  @Get('stats')
  async getStats() {
    return this.projectsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userId = req?.user?.id;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userRole = req?.user?.role;

    const project = await this.projectsService.findById(id, userId, userRole);
    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return project;
  }

  @Get(':id/schedule')
  async getProjectAsSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userId = req?.user?.id;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userRole = req?.user?.role;

    const projectSchedule = await this.projectsService.getProjectAsSchedule(
      id,
      userId,
      userRole,
    );
    if (!projectSchedule) {
      throw new NotFoundException('Projeto não encontrado');
    }
    return projectSchedule;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verificar se o usuário tem permissão para editar o projeto
    const existingProject = await this.projectsService.findById(
      id,
      userId,
      userRole,
    );
    if (!existingProject) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Apenas admin e o diretor dono do projeto podem editar
    if (userRole !== 'admin' && existingProject.team?.director?.id !== userId) {
      throw new NotFoundException(
        'Você não tem permissão para editar este projeto',
      );
    }

    const project = await this.projectsService.update(id, updateProjectDto);
    return {
      message: 'Projeto atualizado com sucesso',
      project,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const userId = req.user.id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const userRole = req.user.role;
      const project = await this.projectsService.findById(id, userId, userRole);
      if (!project) {
        throw new NotFoundException('Projeto não encontrado');
      }
      if (userRole !== 'admin' && project.team?.director?.id !== userId) {
        throw new NotFoundException(
          'Você não tem permissão para excluir este projeto',
        );
      }
      await this.projectsService.delete(id);
      return {
        message: 'Projeto removido com sucesso',
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id/status')
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ProjectStatus,
  ) {
    const project = await this.projectsService.changeStatus(id, status);
    return {
      message: 'Status do projeto atualizado com sucesso',
      project,
    };
  }

  @Patch(':id/health')
  async changeHealth(
    @Param('id', ParseIntPipe) id: number,
    @Body('health') health: ProjectHealth,
  ) {
    const project = await this.projectsService.changeHealth(id, health);
    return {
      message: 'Health do projeto atualizado com sucesso',
      project,
    };
  }

  @Patch(':id/tasks/reorder')
  async reorderTasks(
    @Param('id', ParseIntPipe) projectId: number,
    @Body() reorderDto: ReorderTasksDto,
  ) {
    try {
      const result = await this.schedulesService.reorderTasksByProject(
        projectId,
        reorderDto.tasks,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }
}
