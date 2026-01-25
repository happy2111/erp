// src/common/dto/api-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ required: false, example: 'Операция выполнена успешно' })
  message?: string;

  @ApiProperty()
  data: T;
}
