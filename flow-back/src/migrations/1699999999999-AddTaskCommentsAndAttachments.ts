import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskCommentsAndAttachments1699999999999
  implements MigrationInterface
{
  name = 'AddTaskCommentsAndAttachments1699999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create task_comments table
    await queryRunner.query(`
      CREATE TABLE \`task_comments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`task_id\` int NOT NULL,
        \`user_id\` varchar(36) NOT NULL,
        \`text\` text NOT NULL,
        \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_task_comments_task_id\` (\`task_id\`),
        INDEX \`IDX_task_comments_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB
    `);

    // Create task_attachments table
    await queryRunner.query(`
      CREATE TABLE \`task_attachments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`task_id\` int NOT NULL,
        \`uploaded_by\` varchar(36) NOT NULL,
        \`fileName\` varchar(255) NOT NULL,
        \`originalName\` varchar(255) NOT NULL,
        \`mimeType\` varchar(100) NOT NULL,
        \`fileSize\` bigint NOT NULL,
        \`filePath\` varchar(500) NOT NULL,
        \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_task_attachments_task_id\` (\`task_id\`),
        INDEX \`IDX_task_attachments_uploaded_by\` (\`uploaded_by\`)
      ) ENGINE=InnoDB
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE \`task_comments\` 
      ADD CONSTRAINT \`FK_task_comments_task_id\` 
      FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`task_comments\` 
      ADD CONSTRAINT \`FK_task_comments_user_id\` 
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`task_attachments\` 
      ADD CONSTRAINT \`FK_task_attachments_task_id\` 
      FOREIGN KEY (\`task_id\`) REFERENCES \`tasks\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`task_attachments\` 
      ADD CONSTRAINT \`FK_task_attachments_uploaded_by\` 
      FOREIGN KEY (\`uploaded_by\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE \`task_attachments\` DROP FOREIGN KEY \`FK_task_attachments_uploaded_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`task_attachments\` DROP FOREIGN KEY \`FK_task_attachments_task_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`task_comments\` DROP FOREIGN KEY \`FK_task_comments_user_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`task_comments\` DROP FOREIGN KEY \`FK_task_comments_task_id\``,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE \`task_attachments\``);
    await queryRunner.query(`DROP TABLE \`task_comments\``);
  }
}
