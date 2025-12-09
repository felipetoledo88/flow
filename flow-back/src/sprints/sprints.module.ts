import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SprintsService } from './sprints.service';
import { SprintsController } from './sprints.controller';
import { StatusSprintService } from './status-sprint.service';
import { StatusSprintController } from './status-sprint.controller';
import { Sprint } from '../common/entities/sprint.entity';
import { StatusSprint } from '../common/entities/status-sprint.entity';
import { Task } from '../schedules/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sprint, StatusSprint, Task])],
  controllers: [SprintsController, StatusSprintController],
  providers: [SprintsService, StatusSprintService],
  exports: [SprintsService, StatusSprintService],
})
export class SprintsModule {}
