import { MigrationInterface, QueryRunner } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PopulateStatusSprintTable implements MigrationInterface {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await this.up(queryRunner);
    } finally {
      await queryRunner.release();
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('status_sprint');

    if (!tableExists) {
      return;
    }

    const result = await queryRunner.query(`
      INSERT INTO status_sprint (name, "createdAt", "updatedAt") 
      VALUES 
        ('Em andamento', NOW(), NOW()),
        ('Pendente', NOW(), NOW()),
        ('Concluído', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `);

    const count = await queryRunner.query(
      `SELECT COUNT(*) as count FROM status_sprint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM status_sprint 
      WHERE name IN ('Em andamento', 'Pendente', 'Concluído')
    `);
  }
}
