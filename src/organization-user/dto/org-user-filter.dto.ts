// org-user-filter.dto.ts

import { OrgUserRole } from ".prisma/client-tenant";
import { IsEnum, IsNumber, IsOptional, IsUUID, IsIn, IsString } from "class-validator";

// Определите возможные поля для сортировки и направление
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum OrganizationUserSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  role = 'role',
  position = 'position',
}

export class OrgUserFilterDto {
  // --- Пагинация (PAGINATION) ---
  @IsNumber()
  page: number = 1; // Устанавливаем значение по умолчанию

  @IsNumber()
  limit: number = 10; // Устанавливаем значение по умолчанию

  // --- Фильтрация (FILTERING) ---
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @IsEnum(OrgUserRole, { message: 'Invalid role' })
  @IsOptional()
  role?: OrgUserRole;

  @IsString()
  @IsOptional()
    // Добавление поиска по частичному совпадению (например, по должности)
  search?: string;

  // --- Сортировка (SORTING) ---
  @IsEnum(OrganizationUserSortField, { message: 'Invalid sort field' })
  @IsOptional()
  sortBy?: OrganizationUserSortField = OrganizationUserSortField.createdAt;

  @IsEnum(SortOrder, { message: 'Invalid sort order' })
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;
}