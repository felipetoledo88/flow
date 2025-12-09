import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderColumnToTaskStatus1731299999999
  implements MigrationInterface
{
  name = 'AddOrderColumnToTaskStatus1731299999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona a coluna 'order' à tabela 'task_status'
    await queryRunner.addColumn(
      'task_status',
      new TableColumn({
        name: 'order',
        type: 'int',
        default: 0,
        isNullable: false,
      }),
    );

    // Atualiza os status existentes com valores de ordem sequenciais
    const statuses = await queryRunner.query(
      'SELECT id FROM task_status ORDER BY id ASC',
    );

    for (let i = 0; i < statuses.length; i++) {
      await queryRunner.query(
        'UPDATE task_status SET `order` = ? WHERE id = ?',
        [i + 5, statuses[i].id], // Começar de 1 em vez de 0 para consistência
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove a coluna 'order' da tabela 'task_status'
    await queryRunner.dropColumn('task_status', 'order');
  }
}
