import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Task } from '../schedules/entities/task.entity';
import { TaskHoursHistory } from '../schedules/entities/task-hours-history.entity';
import { Project } from '../projects/entities/project.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskHoursHistory,
      Project,
      Team,
      TeamMember,
      User,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
