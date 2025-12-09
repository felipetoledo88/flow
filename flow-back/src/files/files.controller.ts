import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller('files')
export class FilesController {
  @Get('task-attachments/:filename')
  async getTaskAttachment(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
    const filePath = join(
      process.cwd(),
      uploadsDir,
      'task-attachments',
      filename,
    );

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    return res.sendFile(filePath);
  }
}
