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
  ParseIntPipe,
} from '@nestjs/common';
import { SchedulesProjectService } from './schedules-project.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskHoursDto } from './dto/update-task-hours.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class SchedulesProjectController {
  constructor(
    private readonly schedulesProjectService: SchedulesProjectService,
  ) {}

  @Post()
  async createTask(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.schedulesProjectService.createTask(projectId, createTaskDto);
  }

  @Get()
  async findTasksByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.schedulesProjectService.findTasksByProject(projectId);
  }

  @Patch(':id')
  async updateTask(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.schedulesProjectService.updateTask(taskId, updateTaskDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTask(@Param('id', ParseIntPipe) taskId: number) {
    await this.schedulesProjectService.removeTask(taskId);
  }

  @Patch(':id/hours')
  async updateTaskHours(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() updateHoursDto: UpdateTaskHoursDto,
  ) {
    return this.schedulesProjectService.updateTask(taskId, {
      actualHours: updateHoursDto.actualHours,
    });
  }

  @Patch(':id/backlog')
  async updateTaskBacklogStatus(
    @Param('id', ParseIntPipe) taskId: number,
    @Body('isBacklog') isBacklog: boolean,
  ) {
    return this.schedulesProjectService.updateTaskBacklogStatus(
      taskId,
      isBacklog,
    );
  }

  @Patch(':id/sprint')
  async updateTaskSprint(
    @Param('id', ParseIntPipe) taskId: number,
    @Body('sprintId') sprintId: number | null,
  ) {
    return this.schedulesProjectService.updateTaskSprint(taskId, sprintId);
  }

  @Patch('reorder')
  async reorderTasks(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() reorderDto: ReorderTasksDto,
  ) {
    return this.schedulesProjectService.reorderTasks(
      projectId,
      reorderDto.tasks,
    );
  }

  @Patch('assignee/:assigneeId/recalculate-order')
  async recalculateAssigneeOrder(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('assigneeId', ParseIntPipe) assigneeId: number,
  ): Promise<void> {
    await this.schedulesProjectService.reorderAllTasksSequentially(
      projectId,
      assigneeId,
    );
  }
}
