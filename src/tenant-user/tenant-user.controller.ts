import {Body, Controller, Get, Post} from '@nestjs/common';
import { TenantUserService } from './tenant-user.service';
import {CreateTenantUserDto} from "./dto/create-tenant-user.dto";

@Controller('tenant-user')
export class TenantUserController {
  constructor(private readonly tenantUserService: TenantUserService) {}

  @Post("create")
  async create(@Body() dto: CreateTenantUserDto) {
    return this.tenantUserService.createUser(dto);
  }

  @Get("all")
  async findAll() {
    return this.tenantUserService.findAll();
  }

  @Get(":id")
  async findOne(@Body() id: string) {
    return this.tenantUserService.findOne(id);
  }
}
