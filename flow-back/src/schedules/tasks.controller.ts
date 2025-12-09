import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { SchedulesProjectService } from './schedules-project.service';
import { SchedulesService } from './schedules.service';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskHoursDto } from './dto/update-task-hours.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly schedulesProjectService: SchedulesProjectService,
    private readonly schedulesService: SchedulesService,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskComment)
    private readonly taskCommentRepository: Repository<TaskComment>,
  ) {}

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
    try {
      await this.schedulesProjectService.removeTask(taskId);
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id/hours')
  async updateTaskHours(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() updateHoursDto: UpdateTaskHoursDto,
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    return this.schedulesService.updateTaskHours(
      taskId,
      updateHoursDto,
      userId,
    );
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

  @Get(':id/hours/history')
  async getTaskHoursHistory(@Param('id', ParseIntPipe) taskId: number) {
    return this.schedulesService.getTaskHoursHistory(taskId);
  }

  @Patch('hours/history/:historyId')
  async updateTaskHoursHistory(
    @Param('historyId', ParseIntPipe) historyId: number,
    @Body() updateData: { newHours: number; comment?: string },
  ) {
    return this.schedulesService.updateTaskHoursHistory(historyId, updateData);
  }

  @Delete('hours/history/:historyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTaskHoursHistory(
    @Param('historyId', ParseIntPipe) historyId: number,
  ) {
    await this.schedulesService.deleteTaskHoursHistory(historyId);
  }

  // Task Comments endpoints
  @Get(':id/comments')
  async getTaskComments(@Param('id', ParseIntPipe) taskId: number) {
    return this.taskCommentRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  @Post(':id/comments')
  async createTaskComment(
    @Param('id', ParseIntPipe) taskId: number,
    @Body() createCommentDto: CreateTaskCommentDto,
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    const comment = this.taskCommentRepository.create({
      ...createCommentDto,
      taskId,
      userId,
    });

    const savedComment = await this.taskCommentRepository.save(comment);
    return this.taskCommentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    });
  }

  @Post(':id/comments/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
          const uploadPath = join(
            process.cwd(),
            uploadsDir,
            'task-attachments',
          );
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          cb(null, filename);
        },
      }),
    }),
  )

  async createTaskCommentWithFile(
    @Param('id', ParseIntPipe) taskId: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }

    if (!file) {
      throw new Error('No file provided');
    }

    // Generate file URL
    const fileUrl = `/files/task-attachments/${file.filename}`;

    const comment = this.taskCommentRepository.create({
      taskId,
      userId,
      text: file.originalname, // Use filename as text for file comments
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileUrl: fileUrl,
    });

    const savedComment = await this.taskCommentRepository.save(comment);
    return this.taskCommentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    });
  }

  @Patch('comments/:commentId')
  async updateTaskComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: { text: string },
    @Request() req,
  ) {
    const userId = req.user?.id;
    const comment = await this.taskCommentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Você só pode editar seus próprios comentários');
    }

    // Não permite editar comentários que são arquivos
    if (comment.fileName) {
      throw new BadRequestException('Não é possível editar comentários de arquivo');
    }

    comment.text = updateCommentDto.text;
    const updatedComment = await this.taskCommentRepository.save(comment);

    return this.taskCommentRepository.findOne({
      where: { id: updatedComment.id },
      relations: ['user'],
    });
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTaskComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req,
  ) {
    const userId = req.user?.id;
    const comment = await this.taskCommentRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Você só pode excluir seus próprios comentários');
    }

    await this.taskCommentRepository.softDelete(commentId);
  }
}
