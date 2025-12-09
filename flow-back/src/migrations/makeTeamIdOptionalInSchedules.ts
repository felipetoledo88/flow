import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeTeamIdOptionalInSchedules1730000000000
  implements MigrationInterface
{
  name = 'MakeTeamIdOptionalInSchedules1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tornar a coluna team_id na tabela schedules opcional (nullable)
    await queryRunner.query(`
      ALTER TABLE "schedules" 
      ALTER COLUMN "team_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter a mudança - tornar team_id obrigatório novamente
    // Nota: Isso falhará se existirem registros com team_id NULL
    await queryRunner.query(`
      ALTER TABLE "schedules" 
      ALTER COLUMN "team_id" SET NOT NULL
    `);
  }
}
