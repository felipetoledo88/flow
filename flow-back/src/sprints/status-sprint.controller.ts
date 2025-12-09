import { Controller, Get } from '@nestjs/common';
import { StatusSprintService } from './status-sprint.service';
import { StatusSprint } from '../common/entities/status-sprint.entity';

@Controller('status-sprint')
export class StatusSprintController {
  constructor(private readonly statusSprintService: StatusSprintService) {}

  @Get()
  async findAll(): Promise<StatusSprint[]> {
    return this.statusSprintService.findAll();
  }
}
