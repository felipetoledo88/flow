import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTaskHoursHistoryReferences1730000000002
  implements MigrationInterface
{
  name = 'FixTaskHoursHistoryReferences1730000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Primeiro, vamos dropar a constraint de foreign key se ela existir
    try {
      await queryRunner.query(`
        ALTER TABLE "task_hours_history" 
        DROP CONSTRAINT IF EXISTS "FK_1050a7e6f5f0c4d1cbf4bede470"
      `);
    } catch (error) {
      console.log('Foreign key constraint não encontrada, continuando...');
    }

    // 2. Limpar registros órfãos em task_hours_history que não têm correspondência na tabela tasks
    await queryRunner.query(`
      DELETE FROM "task_hours_history" 
      WHERE "task_id" NOT IN (SELECT "id" FROM "tasks")
    `);

    // 3. Recriar a foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "task_hours_history" 
      ADD CONSTRAINT "FK_task_hours_history_task_id" 
      FOREIGN KEY ("task_id") REFERENCES "tasks"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No down, apenas removemos a constraint que criamos
    await queryRunner.query(`
      ALTER TABLE "task_hours_history" 
      DROP CONSTRAINT IF EXISTS "FK_task_hours_history_task_id"
    `);
  }
}
