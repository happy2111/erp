import { Injectable } from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {CreateTenantUserDto} from "./dto/create-tenant-user.dto";

@Injectable()
export class TenantUserService {
  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateTenantUserDto) {
    const { firstName, lastName, phone, email, password, role } = dto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });
    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
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

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
