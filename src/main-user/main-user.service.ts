import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {CreateMainUserDto} from "./dto/create-main-user.dto";
import * as bcrypt from "bcrypt";
import {retry} from "rxjs";

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
