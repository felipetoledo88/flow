import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReasonToTaskHoursHistory1731700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE task_hours_history 
      ADD COLUMN reason VARCHAR(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE task_hours_history 
      DROP COLUMN reason
    `);
  }
}