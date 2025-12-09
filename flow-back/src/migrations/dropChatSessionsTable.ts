import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class DropChatSessionsTable1730814000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Dropar a tabela chat_sessions se ela existir
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_sessions" CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recriar a tabela chat_sessions caso seja necessário reverter
    await queryRunner.createTable(
      new Table({
        name: 'chat_sessions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'projectId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'messages',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
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
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['projectId'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );
  }
}
