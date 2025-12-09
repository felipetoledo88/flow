import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { Sprint } from '../common/entities/sprint.entity';
import { Task } from '../schedules/entities/task.entity';
import { Team } from '../teams/entities/team.entity';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Sprint, Task, Team]),
    UsersModule,
    TeamsModule,
    forwardRef(() => SchedulesModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
