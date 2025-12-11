import {IsIn, IsOptional, IsString} from "class-validator";

export class GetOrganizationsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  order?: "asc" | "desc" = "desc";

  @IsOptional()
    @IsIn(["name", "email", "phone", "createdAt"])
  sortField?: "name" | "email" | "phone" | "createdAt" = "createdAt";
}
