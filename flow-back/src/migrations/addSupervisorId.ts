import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddSupervisorId implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna supervisorId
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'supervisorId',
        type: 'int',
        isNullable: true,
      }),
    );

    // Adicionar foreign key
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['supervisorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign key
    const table = await queryRunner.getTable('users');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('supervisorId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('users', foreignKey);
    }

    // Remover coluna
    await queryRunner.dropColumn('users', 'supervisorId');
  }
}
