import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSchedulesTable1699000000000 implements MigrationInterface {
  name = 'DropSchedulesTable1699000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign keys que podem estar referenciando a tabela schedules
    await queryRunner.query(`
      -- Remove foreign key constraints from tasks if they reference schedules
      ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "FK_tasks_schedule_id";
    `);

    // Drop the schedules table
    await queryRunner.query(`DROP TABLE IF EXISTS "schedules"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate schedules table (basic structure for rollback)
    await queryRunner.query(`
      CREATE TABLE "schedules" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "project_id" integer NOT NULL,
        "team_id" integer,
        "status" character varying NOT NULL DEFAULT 'planning',
        "start_date" date,
        "expected_end_date" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "is_deleted" boolean NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_schedules" PRIMARY KEY ("id")
      )
    `);

    // Add back foreign key constraints if needed
    await queryRunner.query(`
      ALTER TABLE "schedules" 
      ADD CONSTRAINT "FK_schedules_project_id" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "schedules" 
      ADD CONSTRAINT "FK_schedules_team_id" 
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL
    `);
  }
}
