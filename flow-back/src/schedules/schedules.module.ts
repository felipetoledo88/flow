import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesController } from './schedules.controller';
import { SchedulesProjectController } from './schedules-project.controller';
import { TasksController } from './tasks.controller';
import { TaskStatusController } from './task-status.controller';
import { SchedulesService } from './schedules.service';
import { SchedulesProjectService } from './schedules-project.service';
import { DateCalculatorService } from './services/date-calculator.service';
import { TaskImportService } from './services/task-import.service';
import { Schedule } from './entities/schedule.entity';
import { Task } from './entities/task.entity';
import { TaskStatus } from './entities/task-status.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskHoursHistory } from './entities/task-hours-history.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { Sprint } from '../common/entities/sprint.entity';
import { TeamsModule } from '../teams/teams.module';
import { SprintsModule } from '../sprints/sprints.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      Task,
      TaskStatus,
      TaskDependency,
      TaskHoursHistory,
      TaskComment,
      TaskAttachment,
      Project,
      User,
      Sprint,
    ]),
    TeamsModule,
    SprintsModule,
  ],
  controllers: [
    SchedulesController,
    SchedulesProjectController,
    TasksController,
    TaskStatusController,
  ],
  providers: [
    SchedulesService,
    SchedulesProjectService,
    DateCalculatorService,
    TaskImportService,
  ],
  exports: [SchedulesService, SchedulesProjectService],
})
export class SchedulesModule {}
