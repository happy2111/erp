import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Prisma Error: ${exception.code}`, exception.message);

    let message = 'Database error';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    switch (exception.code) {
      case 'P2002': // Unique constraint failed
        message = 'Duplicate record already exists';
        status = HttpStatus.BAD_REQUEST;
        break;
      case 'P2003': // Foreign key constraint failed
        message = 'Cannot delete or update: related records exist';
        status = HttpStatus.BAD_REQUEST;
        break;
      case 'P2025': // Record not found
        message = 'Record not found';
        status = HttpStatus.NOT_FOUND;
        break;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
