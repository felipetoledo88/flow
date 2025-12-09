import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../../schedules/entities/task-status.entity';

@Injectable()
export class TaskStatusSeed {
  constructor(
    @InjectRepository(TaskStatus)
    private readonly taskStatusRepository: Repository<TaskStatus>,
  ) {}

  async run() {
    const statusesToCreate = [
      { code: 'todo', name: 'A Fazer', order: 1 },
      { code: 'in_progress', name: 'Em Andamento', order: 2 },
      { code: 'blocked', name: 'Bloqueado', order: 3 },
      { code: 'completed', name: 'Concluído', order: 4 },
    ];

    for (const statusData of statusesToCreate) {
      const existingStatus = await this.taskStatusRepository.findOne({
        where: { code: statusData.code },
      });

      if (!existingStatus) {
        await this.taskStatusRepository.save(statusData);
      }
    }
  }
}
