import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileUrlToTaskComments implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE task_comments 
      ADD COLUMN IF NOT EXISTS file_url VARCHAR(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE task_comments 
      DROP COLUMN IF EXISTS file_url
    `);
  }
}
