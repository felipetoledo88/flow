import { Injectable, BadRequestException } from '@nestjs/common';
const csv = require('csv-parser');
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { ImportTaskRowDto } from '../dto/import-task-row.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../entities/task-status.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class TaskImportService {
  constructor(
    @InjectRepository(TaskStatus)
    private readonly taskStatusRepository: Repository<TaskStatus>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  /**
   * Busca usuário por email
   * @param email Email do usuário
   * @returns User encontrado ou null
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  /**
   * Busca status por código (case insensitive)
   * @param statusCode Código do status
   * @param projectId ID do projeto (opcional)
   * @returns TaskStatus encontrado ou null
   */
  private async findStatusByCode(
    statusCode: string,
    projectId?: number,
  ): Promise<TaskStatus | null> {
    const queryBuilder = this.taskStatusRepository
      .createQueryBuilder('taskStatus')
      .where('LOWER(taskStatus.code) = LOWER(:code)', { code: statusCode });

    if (projectId) {
      queryBuilder.andWhere(
        '(taskStatus.projectId = :projectId OR taskStatus.projectId IS NULL)',
        { projectId },
      );
      queryBuilder.orderBy('taskStatus.projectId', 'DESC');
    }

    return await queryBuilder.getOne();
  }

  /**
   * Processa um arquivo CSV ou Excel e retorna array de tarefas
   * @param fileBuffer Buffer do arquivo
   * @param filename Nome do arquivo para detectar tipo
   * @returns Array de tarefas importadas
   */
  async processFile(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<ImportTaskRowDto[]> {
    const extension = filename.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return await this.parseCSV(fileBuffer);
    } else if (extension === 'xlsx' || extension === 'xls') {
      return await this.parseExcel(fileBuffer);
    } else {
      throw new BadRequestException(
        'Formato de arquivo inválido. Use CSV ou Excel (.xlsx, .xls)',
      );
    }
  }

  /**
   * Parseia arquivo CSV
   */
  private async parseCSV(fileBuffer: Buffer): Promise<ImportTaskRowDto[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from(fileBuffer);

      stream
        .pipe(
          csv({
            separator: ',',
            mapHeaders: ({ header }) => header.trim(),
          }),
        )
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            const tasks = await this.mapRowsToDto(results);
            resolve(tasks);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(
            new BadRequestException(`Erro ao processar CSV: ${error.message}`),
          );
        });
    });
  }

  /**
   * Parseia arquivo Excel
   */
  private async parseExcel(fileBuffer: Buffer): Promise<ImportTaskRowDto[]> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Converte para JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: '',
      });

      return await this.mapRowsToDto(rawData);
    } catch (error) {
      throw new BadRequestException(
        `Erro ao processar Excel: ${error.message}`,
      );
    }
  }

  /**
   * Mapeia linhas do arquivo para DTOs
   */
  private async mapRowsToDto(rows: any[]): Promise<ImportTaskRowDto[]> {
    if (!rows || rows.length === 0) {
      throw new BadRequestException('Arquivo vazio ou sem dados para importar');
    }

    const tasks: ImportTaskRowDto[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      try {
        // Valida campos obrigatórios
        if (!row.title && !row.titulo) {
          throw new Error(`Linha ${index + 2}: campo 'title' é obrigatório`);
        }

        if (
          row.estimatedHours === undefined &&
          row.estimatedHours === null &&
          !row.estimatedHours
        ) {
          throw new Error(
            `Linha ${index + 2}: campo 'estimatedHours' é obrigatório`,
          );
        }


        if (row.order === undefined && row.order === null && !row.ordem) {
          throw new Error(`Linha ${index + 2}: campo 'order' é obrigatório`);
        }

        // Processa assignee_email para encontrar assignee_id
        let assigneeId: number | undefined = undefined;
        if (row.assignee_email) {
          const foundUser = await this.findUserByEmail(row.assignee_email);
          if (foundUser) {
            assigneeId = foundUser.id;
          }
        }

        // Processa status se fornecido como texto
        let statusId = row.status_id
          ? this.parseNumber(row.status_id, 'status_id', index + 2)
          : undefined;

        if (!statusId && (row.status || row.situacao)) {
          const statusCode = row.status || row.situacao;
          
          const foundStatus = await this.findStatusByCode(statusCode, undefined);
          if (foundStatus) {
            statusId = foundStatus.id;
          }
        }

        // Mapeia para DTO
        const task: ImportTaskRowDto = {
          title: row.title || row.titulo,
          description: row.description || row.descricao || undefined,
          order: this.parseNumber(row.order || row.ordem, 'order', index + 2),
          assignee_email: row.assignee_email || undefined,
          assignee_id: assigneeId,
          sprint_id: row.sprint_id
            ? this.parseNumber(row.sprint_id, 'sprint_id', index + 2)
            : undefined,
          isBacklog: this.parseBoolean(row.isBacklog),
          estimatedHours: this.parseNumber(
            row.estimatedHours,
            'estimatedHours',
            index + 2,
          ),
          actualHours: row.actualHours
            ? this.parseNumber(row.actualHours, 'actualHours', index + 2)
            : undefined,
          status_id: statusId,
          status: row.status || row.situacao || undefined,
        };

        tasks.push(task);
      } catch (error) {
        throw new BadRequestException(error.message);
      }
    }

    return tasks;
  }

  /**
   * Converte string para número com validação
   */
  private parseNumber(
    value: any,
    fieldName: string,
    lineNumber: number,
  ): number {
    if (value === undefined || value === null || value === '') {
      throw new Error(
        `Linha ${lineNumber}: campo '${fieldName}' é obrigatório`,
      );
    }

    const parsed = Number(value);
    if (isNaN(parsed)) {
      throw new Error(
        `Linha ${lineNumber}: campo '${fieldName}' deve ser um número válido`,
      );
    }

    return parsed;
  }

  /**
   * Converte string para boolean
   */
  private parseBoolean(value: any): boolean {
    if (value === undefined || value === null || value === '') {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const stringValue = String(value).toLowerCase().trim();
    return (
      stringValue === 'true' ||
      stringValue === '1' ||
      stringValue === 'yes' ||
      stringValue === 'sim'
    );
  }

  /**
   * Valida estrutura do arquivo (cabeçalhos)
   */
  validateFileStructure(headers: string[]): void {
    const requiredHeaders = ['title', 'order', 'estimatedHours'];

    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header),
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`,
      );
    }
  }
}
