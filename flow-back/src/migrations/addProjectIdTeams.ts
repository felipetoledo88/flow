import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddProjectIdToTeams implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'teams',
      new TableColumn({
        name: 'projectId',
        type: 'int',
        isNullable: true,
      }),
    );
    await queryRunner.createForeignKey(
      'teams',
      new TableForeignKey({
        columnNames: ['projectId'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('teams');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('projectId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('teams', foreignKey);
    }
    await queryRunner.dropColumn('teams', 'projectId');
  }
}
