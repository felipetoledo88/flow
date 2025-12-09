import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class MigrateTaskStatusToForeignKey1730822100000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a coluna status_id já existe
    const table = await queryRunner.getTable('tasks');
    const hasStatusId = table?.columns.find((col) => col.name === 'status_id');
    const hasStatusEnum = table?.columns.find((col) => col.name === 'status');

    if (hasStatusId) {
      return;
    }

    // Adicionar nova coluna status_id (temporariamente nullable)
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'status_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Migrar dados do enum para IDs (se a coluna status existir)
    if (hasStatusEnum) {
      await queryRunner.query(`
        UPDATE tasks
        SET status_id = (
          SELECT id FROM task_status
          WHERE task_status.code = tasks.status
        )
      `);
    } else {
      // Se não existe coluna status (enum), definir todos como 'todo' (id = 1)
      await queryRunner.query(`
        UPDATE tasks
        SET status_id = (
          SELECT id FROM task_status
          WHERE task_status.code = 'todo'
          LIMIT 1
        )
        WHERE status_id IS NULL
      `);
    }

    // Tornar status_id obrigatório
    await queryRunner.changeColumn(
      'tasks',
      'status_id',
      new TableColumn({
        name: 'status_id',
        type: 'int',
        isNullable: false,
      }),
    );

    // Criar foreign key
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['status_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'task_status',
        onDelete: 'RESTRICT',
      }),
    );

    // Remover coluna status antiga se existir
    if (hasStatusEnum) {
      await queryRunner.dropColumn('tasks', 'status');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna status antiga
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['todo', 'in_progress', 'blocked', 'completed'],
        default: "'todo'",
      }),
    );

    // Migrar dados de volta
    await queryRunner.query(`
      UPDATE tasks
      SET status = (
        SELECT code FROM task_status
        WHERE task_status.id = tasks.status_id
      )
    `);

    // Remover foreign key
    const table = await queryRunner.getTable('tasks');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('status_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('tasks', foreignKey);
      }
    }

    // Remover coluna status_id
    await queryRunner.dropColumn('tasks', 'status_id');
  }
}
