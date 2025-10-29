import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async createTenant(name: string, ownerId: string) {
    const apiKey = randomBytes(24).toString('hex'); // сгенерить api_key
    const dbName = `tenant_${Date.now()}`; // простое имя, позже можно по id

    const tenant = await this.prisma.tenant.create({
      data: { name, db_name: dbName, api_key: apiKey, ownerId },
    });

    // NOTE: физическое создание отдельной базы и инициализация схемы
    // можно сделать позже (скрипт/exec). Сейчас мы просто создаём запись в main_db.

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany();
  }
}
