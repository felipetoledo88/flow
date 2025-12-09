import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TeamsModule } from './teams/teams.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SprintsModule } from './sprints/sprints.module';
import { User } from './users/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { Team } from './teams/entities/team.entity';
import { TeamMember } from './teams/entities/team-member.entity';
import { Schedule } from './schedules/entities/schedule.entity';
import { Task } from './schedules/entities/task.entity';
import { TaskStatus } from './schedules/entities/task-status.entity';
import { TaskDependency } from './schedules/entities/task-dependency.entity';
import { TaskHoursHistory } from './schedules/entities/task-hours-history.entity';
import { TaskComment } from './schedules/entities/task-comment.entity';
import { Sprint } from './common/entities/sprint.entity';
import { StatusSprint } from './common/entities/status-sprint.entity';
import { SeederService } from './database/seeder.service';
import { UserSeed } from './database/seeds/user.seed';
import { TaskStatusSeed } from './database/seeds/task-status.seed';
import { StatusSprintSeed } from './database/seeds/status-sprint.seed';
import { CreateStatusSprintTableAndRelation } from './migrations/createStatusSprintTableAndRelation';
import { PopulateStatusSprintTable } from './migrations/populateStatusSprintTable';
import { FilesController } from './files/files.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'password'),
        database: configService.get('DATABASE_NAME', 'nx_flow'),
        entities: [
          User,
          Project,
          Team,
          TeamMember,
          Schedule,
          Task,
          TaskStatus,
          TaskDependency,
          TaskHoursHistory,
          TaskComment,
          Sprint,
          StatusSprint,
        ],
        synchronize: true,
        logging: configService.get('NODE_ENV') === 'development',
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([TaskStatus, StatusSprint]),
    AuthModule,
    UsersModule,
    ProjectsModule,
    TeamsModule,
    SchedulesModule,
    SprintsModule,
  ],
  controllers: [AppController, FilesController],
  providers: [
    AppService,
    SeederService,
    UserSeed,
    TaskStatusSeed,
    StatusSprintSeed,
    CreateStatusSprintTableAndRelation,
    PopulateStatusSprintTable,
  ],
})
export class AppModule {}
