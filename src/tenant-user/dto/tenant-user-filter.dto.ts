import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean, IsUUID } from "class-validator";

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum UserSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  email = 'email',
  firstName = 'profile.firstName', // Используем для сортировки по имени
  lastName = 'profile.lastName',   // Используем для сортировки по фамилии
}

export class TenantUserFilterDto {
  @IsNumber()
  page: number = 1;
  @IsNumber()
  limit: number = 10;

  @IsEnum(UserSortField)
  @IsOptional()
  sortBy?: UserSortField = UserSortField.createdAt;

  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder = SortOrder.DESC;

  // --- Фильтрация (User fields) ---
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID()
  @IsOptional()
  roleId?: string; // Фильтрация по Role ID

  // --- Сквозной поиск (User, UserProfile, UserPhone) ---
  @IsString()
  @IsOptional()
    // Поиск по Email, Имени, Фамилии или Номеру телефона.
  search?: string;
}