import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTasksToScheduleTasks1730000000000
  implements MigrationInterface
{
  name = 'RenameTasksToScheduleTasks1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" RENAME TO "tasks"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" RENAME TO "tasks"`);
  }
}
