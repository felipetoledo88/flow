import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SchedulesService } from './schedules.service';
import { TaskImportService } from './services/task-import.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskHoursDto } from './dto/update-task-hours.dto';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly taskImportService: TaskImportService,
  ) {}

  @Post()
  create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.create(createScheduleDto);
  }

  @Get()
  findAll(@Query('projectId') projectId?: string) {
    return this.schedulesService.findAll(projectId ? +projectId : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schedulesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(+id, updateScheduleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.schedulesService.remove(+id);
  }

  @Get(':scheduleId/tasks')
  findTasksBySchedule(@Param('scheduleId') scheduleId: string) {
    return this.schedulesService.findTasksBySchedule(+scheduleId);
  }

  @Post(':scheduleId/tasks')
  createTask(
    @Param('scheduleId') scheduleId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.schedulesService.createTask(+scheduleId, createTaskDto);
  }

  @Post(':scheduleId/tasks/import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )

  async importTasks(
    @Param('scheduleId') scheduleId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    try {
      const tasksData = await this.taskImportService.processFile(
        file.buffer,
        file.originalname,
      );

      const createTaskDtos: CreateTaskDto[] = tasksData.map((task, index) => {
        return {
          title: task.title,
          description: task.description,
          assigneeId: task.assignee_id || undefined,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          sprintId: task.sprint_id,
          statusId: task.status_id,
          order: task.order,
          isBacklog: task.isBacklog,
        };
      });

      const projectId = +scheduleId;

      const project = await this.schedulesService.validateProject(projectId);
      if (!project) {
        throw new BadRequestException('Projeto não encontrado');
      }

      const importedTasks = await this.schedulesService.importTasksBulk(
        projectId,
        createTaskDtos,
      );

      return {
        message: `${importedTasks.length} tarefas importadas com sucesso`,
        tasks: importedTasks,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        error.message ||
          'Erro ao importar tarefas. Verifique os dados do arquivo.',
      );
    }
  }

  @Patch('tasks/:taskId')
  updateTask(
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.schedulesService.updateTask(+taskId, updateTaskDto);
  }

  @Patch('tasks/:taskId/backlog')
  updateTaskBacklogStatus(
    @Param('taskId') taskId: string,
    @Body() body: { isBacklog: boolean },
  ) {
    return this.schedulesService.updateTaskBacklogStatus(
      +taskId,
      body.isBacklog,
    );
  }

  @Patch('tasks/:taskId/sprint')
  updateTaskSprint(
    @Param('taskId') taskId: string,
    @Body() body: { sprintId: number | null },
  ) {
    return this.schedulesService.updateTaskSprint(+taskId, body.sprintId);
  }

  @Patch('tasks/:taskId/hours')
  updateTaskHours(
    @Param('taskId') taskId: string,
    @Body() updateHoursDto: UpdateTaskHoursDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.schedulesService.updateTaskHours(
      +taskId,
      updateHoursDto,
      userId,
    );
  }

  @Post(':scheduleId/force-recalculate/:assigneeId')
  async forceRecalculateAssignee(
    @Param('scheduleId') scheduleId: string,
    @Param('assigneeId') assigneeId: string,
  ) {
    return this.schedulesService.forceRecalculateAssignee(
      +scheduleId,
      +assigneeId,
    );
  }

  @Get('tasks/:taskId/hours/history')
  getTaskHoursHistory(@Param('taskId') taskId: string) {
    return this.schedulesService.getTaskHoursHistory(+taskId);
  }

  @Patch('tasks/hours/history/:historyId')
  updateTaskHoursHistory(
    @Param('historyId') historyId: string,
    @Body() updateData: { newHours: number; comment?: string },
  ) {
    return this.schedulesService.updateTaskHoursHistory(+historyId, updateData);
  }

  @Delete('tasks/hours/history/:historyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTaskHoursHistory(@Param('historyId') historyId: string) {
    return this.schedulesService.deleteTaskHoursHistory(+historyId);
  }

  @Delete('tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTask(@Param('taskId') taskId: string) {
    return this.schedulesService.removeTask(+taskId);
  }

  @Post('tasks/dependencies')
  createDependency(@Body() createDependencyDto: CreateTaskDependencyDto) {
    return this.schedulesService.createDependency(createDependencyDto);
  }

  @Delete('tasks/dependencies/:dependencyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDependency(@Param('dependencyId') dependencyId: string) {
    return this.schedulesService.removeDependency(+dependencyId);
  }

  @Patch(':scheduleId/tasks/reorder')
  reorderTasks(
    @Param('scheduleId') scheduleId: string,
    @Body() reorderDto: ReorderTasksDto,
  ) {
    return this.schedulesService.reorderTasks(+scheduleId, reorderDto.tasks);
  }

  @Post(':scheduleId/force-recalculate')
  async forceRecalculate(@Param('scheduleId') scheduleId: string) {
    try {
      const result = await this.schedulesService.forceRecalculateSchedule(+scheduleId);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('tasks/:taskId/force-recalculate')
  async forceRecalculateTask(@Param('taskId') taskId: string) {
    return this.schedulesService.forceRecalculateTask(+taskId);
  }

  @Post(':scheduleId/fix-duplicate-orders')
  async fixDuplicateOrders(@Param('scheduleId') scheduleId: string) {
    return this.schedulesService.fixDuplicateOrders(+scheduleId);
  }

  @Post('sprints/:sprintId/reorder-after-completion')
  async reorderTasksAfterSprintCompletion(@Param('sprintId') sprintId: string) {
    return this.schedulesService.reorderTasksAfterSprintCompletion(+sprintId);
  }
}
