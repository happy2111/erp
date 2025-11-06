import {IsString, IsUUID, MaxLength} from "class-validator";

export class CreateTenantDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsUUID()
  ownerId: string; // id пользователя main_db (можно потом расширить)

  @IsString()
  hostname: string;
}
