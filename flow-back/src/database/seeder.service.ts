import { Injectable, OnModuleInit } from '@nestjs/common';
import { UserSeed } from './seeds/user.seed';
import { TaskStatusSeed } from './seeds/task-status.seed';
import { StatusSprintSeed } from './seeds/status-sprint.seed';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    private readonly userSeed: UserSeed,
    private readonly taskStatusSeed: TaskStatusSeed,
    private readonly statusSprintSeed: StatusSprintSeed,
  ) {}

  async onModuleInit() {
    console.log('🌱 Iniciando seeders...');
    await this.runAllSeeds();
    console.log('✅ Seeders concluídos!');
  }

  private async runAllSeeds() {
    try {
      await this.taskStatusSeed.run();
      await this.statusSprintSeed.run();
      await this.userSeed.run();
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.error('❌ Erro ao executar seeders:', error.stack);
    }
  }
}
