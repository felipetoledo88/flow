import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectIdToTaskStatus implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar a coluna project_id à tabela task_status
    await queryRunner.query(`
      ALTER TABLE task_status 
      ADD COLUMN IF NOT EXISTS project_id INTEGER
    `);

    // Adicionar foreign key constraint
    await queryRunner.query(`
      ALTER TABLE task_status 
      ADD CONSTRAINT FK_task_status_project 
      FOREIGN KEY (project_id) REFERENCES projects(id) 
      ON DELETE CASCADE
    `);

    // Remover a constraint UNIQUE do código, já que agora pode haver códigos duplicados em projetos diferentes
    await queryRunner.query(`
      ALTER TABLE task_status 
      DROP INDEX IF EXISTS IDX_task_status_code
    `);

    // Criar um índice composto para garantir unicidade do código por projeto
    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_task_status_code_project 
      ON task_status (code, project_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover o índice composto
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_task_status_code_project
    `);

    // Recriar a constraint UNIQUE no código (se não houver duplicatas)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IDX_task_status_code 
      ON task_status (code)
    `);

    // Remover a foreign key constraint
    await queryRunner.query(`
      ALTER TABLE task_status 
      DROP FOREIGN KEY IF EXISTS FK_task_status_project
    `);

    // Remover a coluna project_id
    await queryRunner.query(`
      ALTER TABLE task_status 
      DROP COLUMN IF EXISTS project_id
    `);
  }
}
