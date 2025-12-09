import { MigrationInterface, QueryRunner } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CreateStatusSprintTableAndRelation implements MigrationInterface {
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
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS status_sprint (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO status_sprint (name, "createdAt", "updatedAt") 
      VALUES 
        ('Em andamento', NOW(), NOW()),
        ('Pendente', NOW(), NOW()),
        ('Concluído', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE sprints 
      ADD COLUMN IF NOT EXISTS status_sprint_id INTEGER REFERENCES status_sprint(id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sprints 
      DROP COLUMN IF EXISTS status_sprint_id
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS status_sprint
    `);
  }
}
