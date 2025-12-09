import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
  Patch,
  BadRequestException,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TaskStatus } from './entities/task-status.entity';
import { Task } from './entities/task.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('task-status')
@UseGuards(JwtAuthGuard)
export class TaskStatusController {
  constructor(
    @InjectRepository(TaskStatus)
    private readonly taskStatusRepository: Repository<TaskStatus>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  @Get()
  async findAll(@Query('projectId') projectId?: number): Promise<TaskStatus[]> {
    if (projectId) {
      // Para um projeto específico, retorna status globais + status específicos do projeto
      return this.taskStatusRepository.find({
        where: [
          { projectId: projectId },
          { projectId: IsNull() }, // Status globais
        ],
        order: { order: 'ASC', id: 'ASC' },
      });
    } else {
      // Retorna todos os status
      return this.taskStatusRepository.find({
        order: { order: 'ASC', id: 'ASC' },
      });
    }
  }

  @Post()
  async create(
    @Body() createTaskStatusDto: { name: string; projectId?: number },
  ): Promise<TaskStatus> {
    // Gera código automaticamente baseado no nome (kebab-case)
    const code = createTaskStatusDto.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '_') // Substitui espaços por underscore
      .trim();

    // Encontra o próximo valor de ordem para o projeto específico ou global
    let maxOrderQuery = this.taskStatusRepository
      .createQueryBuilder('status')
      .select('MAX(status.order)', 'maxOrder');

    if (createTaskStatusDto.projectId) {
      maxOrderQuery = maxOrderQuery.where('status.projectId = :projectId', {
        projectId: createTaskStatusDto.projectId,
      });
    } else {
      maxOrderQuery = maxOrderQuery.where('status.projectId IS NULL');
    }

    const maxOrder = await maxOrderQuery.getRawOne();

    const nextOrder = (maxOrder?.maxOrder || 0) + 1;

    const taskStatus = this.taskStatusRepository.create({
      name: createTaskStatusDto.name,
      code: code,
      order: nextOrder,
      projectId: createTaskStatusDto.projectId,
    });

    return this.taskStatusRepository.save(taskStatus);
  }

  @Patch('reorder')
  async reorder(
    @Body() reorderData: { statusId: number; newOrder: number }[],
  ): Promise<{ message: string }> {
    try {
      if (!Array.isArray(reorderData)) {
        throw new BadRequestException(
          'Dados de reordenação devem ser um array.',
        );
      }

      if (reorderData.length === 0) {
        throw new BadRequestException(
          'Array de reordenação não pode estar vazio.',
        );
      }

      // Validar dados primeiro
      for (const item of reorderData) {
        if (
          item.statusId === undefined ||
          item.statusId === null ||
          item.newOrder === undefined ||
          item.newOrder === null ||
          item.newOrder < 0
        ) {
          throw new BadRequestException(
            'statusId e newOrder são obrigatórios e newOrder deve ser >= 0.',
          );
        }

        // Verificar se o status existe
        const existingStatus = await this.taskStatusRepository.findOne({
          where: { id: item.statusId }
        });

        if (!existingStatus) {
          throw new BadRequestException(
            `Status com ID ${item.statusId} não encontrado.`,
          );
        }
      }
      // Atualizar cada status individualmente
      for (const item of reorderData) {
        const result = await this.taskStatusRepository.update(
          { id: item.statusId },
          { order: item.newOrder },
        );

        if (result.affected === 0) {
          throw new BadRequestException(
            `Falha ao atualizar status com ID ${item.statusId}.`,
          );
        }
      }

      // Verificar se os dados foram realmente salvos
      const updatedStatuses = await this.taskStatusRepository.find({
        order: { order: 'ASC', id: 'ASC' },
      });

      return { message: 'Status reordenados com sucesso.' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Erro ao reordenar status: ' + error.message,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() updateTaskStatusDto: { name?: string },
  ): Promise<TaskStatus> {
    const taskStatus = await this.taskStatusRepository.findOne({
      where: { id },
    });

    if (!taskStatus) {
      throw new NotFoundException(`Status com ID ${id} não encontrado.`);
    }

    // Atualiza apenas o nome
    if (updateTaskStatusDto.name) {
      taskStatus.name = updateTaskStatusDto.name;

      // Regenera o código se o nome mudou
      taskStatus.code = updateTaskStatusDto.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim();
    }

    return this.taskStatusRepository.save(taskStatus);
  }

  @Get(':id/can-delete')
  async canDelete(@Param('id') id: number): Promise<{
    canDelete: boolean;
    taskCount?: number;
    message?: string;
  }> {
    const taskStatus = await this.taskStatusRepository.findOne({
      where: { id },
    });

    if (!taskStatus) {
      throw new NotFoundException(`Status com ID ${id} não encontrado.`);
    }

    // Conta quantas tarefas estão usando este status
    const taskCount = await this.taskRepository.count({
      where: { statusId: id },
    });

    if (taskCount > 0) {
      return {
        canDelete: false,
        taskCount,
        message: `Este status está sendo usado por ${taskCount} tarefa(s).`,
      };
    }

    return { canDelete: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    const taskStatus = await this.taskStatusRepository.findOne({
      where: { id },
    });

    if (!taskStatus) {
      throw new NotFoundException(`Status com ID ${id} não encontrado.`);
    }

    // Verifica se há tarefas usando este status
    const taskCount = await this.taskRepository.count({
      where: { statusId: id },
    });

    if (taskCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir o status '${taskStatus.name}' pois existem ${taskCount} tarefa(s) utilizando este status.`,
      );
    }

    // Verifica se não é um status padrão do sistema
    const systemStatuses = ['todo', 'in_progress', 'blocked', 'completed'];
    if (systemStatuses.includes(taskStatus.code)) {
      throw new BadRequestException(
        `Não é possível excluir o status '${taskStatus.name}' pois é um status padrão do sistema.`,
      );
    }

    await this.taskStatusRepository.softDelete(taskStatus.id);
  }
}
