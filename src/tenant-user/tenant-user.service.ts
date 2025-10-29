import { Injectable } from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {CreateTenantUserDto} from "./dto/create-tenant-user.dto";

@Injectable()
export class TenantUserService {
  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateTenantUserDto) {
    const { phone, email, password, role } = dto;

    const user = await this.prisma.user.create({
      data: {
        phone,
        email,
        password,
        ...(role ? { role } : {}),
      },
    });

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

}
