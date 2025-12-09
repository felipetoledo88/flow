import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Sprint } from '../common/entities/sprint.entity';
import { StatusSprint } from '../common/entities/status-sprint.entity';
import { StatusSprint as StatusSprintEnum } from '../common/enums/status-sprint.enum';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { Task, TaskStatusEnum } from '../schedules/entities/task.entity';

@Injectable()
export class SprintsService {
  constructor(
    @InjectRepository(Sprint)
    private sprintRepository: Repository<Sprint>,
    @InjectRepository(StatusSprint)
    private statusSprintRepository: Repository<StatusSprint>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  private parseLocalDate(dateString: string): Date {
    const parsedDate = new Date(dateString + 'T00:00:00');
    return parsedDate;
  }

  async create(createSprintDto: CreateSprintDto): Promise<Sprint> {
    const existingSprints = await this.sprintRepository.count({
      where: { projectId: createSprintDto.projectId },
    });

    let defaultStatus;
    if (existingSprints === 0) {
      defaultStatus = await this.statusSprintRepository.findOne({
        where: { name: StatusSprintEnum.EM_ANDAMENTO },
      });
    } else {
      defaultStatus = await this.statusSprintRepository.findOne({
        where: { name: StatusSprintEnum.PENDENTE },
      });
    }
    if (!defaultStatus) {
      throw new BadRequestException(
        `Status ${existingSprints === 0 ? '"Em andamento"' : '"Pendente"'} não encontrado. Execute as migrations primeiro.`,
      );
    }
    const sprint = this.sprintRepository.create({
      ...createSprintDto,
      startDate: new Date(), // Define automaticamente a data de criação
      statusSprintId: defaultStatus.id,
      expectDate: createSprintDto.expectDate
        ? this.parseLocalDate(createSprintDto.expectDate)
        : undefined,
      expectEndDate: createSprintDto.expectEndDate
        ? this.parseLocalDate(createSprintDto.expectEndDate)
        : undefined,
    });
    const savedSprint = await this.sprintRepository.save(sprint);
    return savedSprint;
  }

  async findAll(): Promise<Sprint[]> {
    return this.sprintRepository.find({
      relations: ['project', 'statusSprint'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByProject(projectId: number): Promise<Sprint[]> {
    return this.sprintRepository.find({
      where: { projectId },
      relations: ['project', 'statusSprint'],
      order: { expectDate: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Sprint> {
    const sprint = await this.sprintRepository.findOne({
      where: { id },
      relations: ['project', 'statusSprint'],
    });

    if (!sprint) {
      throw new NotFoundException(`Sprint com ID ${id} não encontrada`);
    }

    return sprint;
  }

  async update(id: number, updateSprintDto: UpdateSprintDto): Promise<Sprint> {
    const sprint = await this.findOne(id);
    // Validar se statusSprintId existe se fornecido
    if (updateSprintDto.statusSprintId) {
      const statusSprint = await this.statusSprintRepository.findOne({
        where: { id: updateSprintDto.statusSprintId },
      });
      if (!statusSprint) {
        throw new BadRequestException(
          `Status de sprint com ID ${updateSprintDto.statusSprintId} não encontrado`,
        );
      }
      // Se o status for "Concluído", definir endDate como hoje e atualizar próxima sprint
      if (statusSprint.name === StatusSprintEnum.CONCLUIDO) {
        updateSprintDto.endDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        // Encontrar e atualizar próxima sprint se estiver pendente
        await this.updateNextSprintToInProgress(id);
      }
    }

    const updateData: any = {
      ...updateSprintDto,
    };

    // Processar datas apenas se fornecidas
    if (updateSprintDto.expectDate) {
      updateData.expectDate = this.parseLocalDate(updateSprintDto.expectDate);
    }
    if (updateSprintDto.expectEndDate) {
      updateData.expectEndDate = this.parseLocalDate(
        updateSprintDto.expectEndDate,
      );
    }
    if (updateSprintDto.endDate) {
      updateData.endDate = this.parseLocalDate(updateSprintDto.endDate);
    }

    // Usar query builder para atualização direta se for apenas statusSprintId e endDate
    const keysToUpdate = Object.keys(updateData);
    const isSimpleStatusUpdate =
      keysToUpdate.length <= 2 &&
      keysToUpdate.includes('statusSprintId') &&
      (keysToUpdate.length === 1 || keysToUpdate.includes('endDate'));

    if (isSimpleStatusUpdate) {
      const setClause: any = { statusSprintId: updateData.statusSprintId };
      if (updateData.endDate) {
        setClause.endDate = updateData.endDate;
      }

      await this.sprintRepository
        .createQueryBuilder()
        .update(Sprint)
        .set(setClause)
        .where('id = :id', { id })
        .execute();

      // Buscar sprint atualizada
      const updatedSprint = await this.findOne(id);
      return updatedSprint;
    }

    // Para outras atualizações, usar o método normal
    Object.assign(sprint, updateData);
    const updatedSprint = await this.sprintRepository.save(sprint);
    return updatedSprint;
  }

  async remove(id: number): Promise<void> {
    const sprint = await this.findOne(id);

    // Verificar se há atividades vinculadas a esta Sprint
    const linkedTasks = await this.taskRepository.find({
      where: { sprintId: id },
      select: ['id', 'title'],
    });

    if (linkedTasks.length > 0) {
      throw new BadRequestException(
        `Não é possível excluir a sprint "${sprint.name}" porque há ${linkedTasks.length} atividade(s) vinculada(s) a ela. ` +
          `Primeiro mova ou exclua as atividades da sprint.`,
      );
    }
    await this.sprintRepository.softDelete(sprint.id);
  }

  async findNextSprint(currentSprintId: number): Promise<Sprint | null> {
    const currentSprint = await this.findOne(currentSprintId);

    if (!currentSprint.expectEndDate) {
      return null;
    }

    // Buscar próxima sprint do mesmo projeto com data de início após a data de término atual
    const nextSprint = await this.sprintRepository
      .createQueryBuilder('sprint')
      .leftJoinAndSelect('sprint.statusSprint', 'statusSprint')
      .where('sprint.projectId = :projectId', {
        projectId: currentSprint.projectId,
      })
      .andWhere('sprint.id != :currentSprintId', { currentSprintId })
      .andWhere('sprint.expectDate > :endDate', {
        endDate: currentSprint.expectEndDate,
      })
      .orderBy('sprint.expectDate', 'ASC')
      .getOne();

    return nextSprint;
  }

  async updateNextSprintToInProgress(completedSprintId: number): Promise<void> {
    try {
      const nextSprint = await this.findNextSprint(completedSprintId);

      if (!nextSprint) {
        return;
      }

      // Verificar se a próxima sprint está com status "Pendente"
      if (nextSprint.statusSprint?.name === StatusSprintEnum.PENDENTE) {
        // Buscar ID do status "Em andamento"
        const statusEmAndamento = await this.statusSprintRepository.findOne({
          where: { name: StatusSprintEnum.EM_ANDAMENTO },
        });

        if (!statusEmAndamento) {
          return;
        }

        // Atualizar próxima sprint para "Em andamento"
        const updateResult = await this.sprintRepository
          .createQueryBuilder()
          .update(Sprint)
          .set({ statusSprintId: statusEmAndamento.id })
          .where('id = :id', { id: nextSprint.id })
          .execute();
        // Verificar se realmente foi atualizada
        await this.findOne(nextSprint.id);
      }
    } catch (error) {
      console.error(
        'Service - Erro ao atualizar status da próxima sprint:',
        error,
      );
      // Não lança erro para não interromper o processo principal de conclusão da sprint
    }
  }

  async transferIncompleteTasksToNextSprint(fromSprintId: number): Promise<{
    transferredCount: number;
    nextSprintName: string;
    incompleteTasks: any[];
  }> {
    const nextSprint = await this.findNextSprint(fromSprintId);

    if (!nextSprint) {
      throw new BadRequestException(
        'Não foi encontrada uma próxima sprint para transferir as atividades',
      );
    }

    // Buscar atividades não concluídas da sprint atual
    const incompleteTasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.status', 'status')
      .where('task.sprintId = :sprintId', { sprintId: fromSprintId })
      .andWhere('status.code != :completedCode', { completedCode: 'completed' })
      .getMany();

    if (incompleteTasks.length === 0) {
      return {
        transferredCount: 0,
        nextSprintName: nextSprint.name,
        incompleteTasks: [],
      };
    }

    // Transferir atividades para a próxima sprint e reorganizar order por assignee
    const taskIds = incompleteTasks.map((task) => task.id);

    // Transferir tarefas mantendo o order global - apenas mudar sprintId
    await this.taskRepository
      .createQueryBuilder()
      .update()
      .set({ sprintId: nextSprint.id })
      .where('id IN (:...taskIds)', { taskIds })
      .execute();

    // Trigger recálculo das datas para os usuários afetados
    try {
      const affectedAssignees = [...new Set(incompleteTasks.map(t => t.assigneeId))];
      const projectId = nextSprint.projectId;
      
      // Atualizar updatedAt para triggerar recálculo no próximo acesso
      for (const assigneeId of affectedAssignees) {
        await this.taskRepository
          .createQueryBuilder()
          .update()
          .set({ updatedAt: new Date() })
          .where('projectId = :projectId', { projectId })
          .andWhere('assigneeId = :assigneeId', { assigneeId })
          .andWhere('isBacklog = false')
          .execute();
      }
    } catch (error) {
      console.warn('Erro ao triggerar recálculo após transferência:', error);
      // Não interrompe o processo, apenas log do erro
    }

    return {
      transferredCount: incompleteTasks.length,
      nextSprintName: nextSprint.name,
      incompleteTasks: incompleteTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: {
          code: task.status.code,
          name: task.status.name,
        },
      })),
    };
  }
}
