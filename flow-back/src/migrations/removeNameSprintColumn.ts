import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveNameSprintAndCreatedAtColumns implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover a coluna nameSprint da tabela sprints
    await queryRunner.dropColumn('sprints', 'nameSprint');

    // Remover a coluna createdAt da tabela sprints
    await queryRunner.dropColumn('sprints', 'createdAt');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recriar a coluna createdAt caso seja necessário reverter
    await queryRunner.addColumn(
      'sprints',
      new TableColumn({
        name: 'createdAt',
        type: 'timestamp',
        default: 'CURRENT_TIMESTAMP',
        isNullable: false,
      }),
    );

    // Recriar a coluna nameSprint caso seja necessário reverter
    await queryRunner.addColumn(
      'sprints',
      new TableColumn({
        name: 'nameSprint',
        type: 'varchar',
        length: '255',
        isNullable: false,
      }),
    );
  }
}
