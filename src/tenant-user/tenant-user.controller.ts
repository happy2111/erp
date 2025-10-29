import {Body, Controller, Get, Post} from '@nestjs/common';
import { TenantUserService } from './tenant-user.service';
import {CreateTenantUserDto} from "./dto/create-tenant-user.dto";

@Controller('tenant-user')
export class TenantUserController {
  constructor(private readonly tenantUserService: TenantUserService) {}

  @Post("")
  async create(@Body() dto: CreateTenantUserDto) {
    return this.tenantUserService.createUser(dto);
  }

  @Get("")
  async findAll() {
    return this.tenantUserService.findAll();
  }

}
