import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards
} from '@nestjs/common';
import {MainUserService} from "./main-user.service";
import {CreateMainUserDto} from "./dto/create-main-user.dto";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {RolesGuard} from "../auth/guards/roles.guard";
import {Roles} from "../auth/decorators/roles.decorator";
import {UserRole} from "@prisma/client";

@Controller('main-user')
export class MainUserController {
  constructor(private readonly mainUserService: MainUserService) {}

  @Post("create")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  async create(@Body() dto: CreateMainUserDto) {
    return this.mainUserService.createUser(dto);
  }

  @Get("all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  async findAll() {
    return this.mainUserService.findAll();
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER, UserRole.OWNER)
  async findOne(@Param() id: string) {
    return this.mainUserService.findOne(id);
  }


  @Delete(":id/hard")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  async delete(@Param('id') id: string) {
    return this.mainUserService.delete(id);
  }


}
