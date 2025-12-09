import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusSprint } from '../../common/entities/status-sprint.entity';
import { StatusSprint as StatusSprintEnum } from '../../common/enums/status-sprint.enum';

@Injectable()
export class StatusSprintSeed {
  constructor(
    @InjectRepository(StatusSprint)
    private readonly statusSprintRepository: Repository<StatusSprint>,
  ) {}

  async run() {
    const statusesToCreate = [
      { name: StatusSprintEnum.PENDENTE },
      { name: StatusSprintEnum.EM_ANDAMENTO },
      { name: StatusSprintEnum.CONCLUIDO },
    ];

    for (const statusData of statusesToCreate) {
      const existingStatus = await this.statusSprintRepository.findOne({
        where: { name: statusData.name },
      });

      if (!existingStatus) {
        await this.statusSprintRepository.save(statusData);
      }
    }
  }
}
