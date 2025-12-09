import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTaskStatusTable1730822000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela task_status
    await queryRunner.createTable(
      new Table({
        name: 'task_status',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'order',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Popular tabela com status padrão
    await queryRunner.query(`
      INSERT INTO task_status (code, name, \`order\`) VALUES
      ('todo', 'A Fazer', 1),
      ('in_progress', 'Em Andamento', 2),
      ('blocked', 'Bloqueado', 3),
      ('completed', 'Concluído', 4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('task_status');
  }
}
