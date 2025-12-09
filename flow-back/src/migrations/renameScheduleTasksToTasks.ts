import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameScheduleTasksToTasks1730000000001
  implements MigrationInterface
{
  name = 'RenameScheduleTasksToTasks1730000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" RENAME TO "tasks"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" RENAME TO "tasks"`);
  }
}
