import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusSprint } from '../common/entities/status-sprint.entity';

@Injectable()
export class StatusSprintService {
  constructor(
    @InjectRepository(StatusSprint)
    private statusSprintRepository: Repository<StatusSprint>,
  ) {}

  async findAll(): Promise<StatusSprint[]> {
    return this.statusSprintRepository.find({
      order: { id: 'ASC' },
    });
  }
}
