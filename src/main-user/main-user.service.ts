import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {CreateMainUserDto} from "./dto/create-main-user.dto";
import * as bcrypt from "bcrypt";
import {retry} from "rxjs";
import { UserFilterDto } from "./dto/filter-main-user.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class MainUserService {
  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateMainUserDto) {
    const { firstName, lastName, phone, email, password, role } = dto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });
    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        password: hashed,
        ...(role ? { role } : {}),
      },
    });
    return user;
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async filterUsers( query: UserFilterDto) {
    const where: Prisma.UserWhereInput = {};

    // ---- Поля ----
    if (query.firstName) where.firstName = { contains: query.firstName, mode: 'insensitive' };
    if (query.lastName) where.lastName = { contains: query.lastName, mode: 'insensitive' };
    if (query.phone) where.phone = { contains: query.phone };
    if (query.email) where.email = { contains: query.email, mode: 'insensitive' };
    if (query.role) where.role = query.role;

    // ---- Поиск ----
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    // ---- createdAt ----
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) where.createdAt.gte = query.createdFrom;
      if (query.createdTo) where.createdAt.lte = query.createdTo;
    }

    // ---- updatedAt ----
    if (query.updatedFrom || query.updatedTo) {
      where.updatedAt = {};
      if (query.updatedFrom) where.updatedAt.gte = query.updatedFrom;
      if (query.updatedTo) where.updatedAt.lte = query.updatedTo;
    }

    // ---- Пагинация ----
    const take = query.limit ?? 20;
    const skip = (query.page - 1) * take;

    // ---- Выполнить запрос ----
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      total,
      page: query.page,
      limit: take,
      items,
    };
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    await this.prisma.user.delete({where: {id}});

    return {message: "User deleted successfully"};
  }
}
