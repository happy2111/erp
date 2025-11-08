import {Body, Controller, Get, Param, Post} from '@nestjs/common';
import {MainUserService} from "./main-user.service";
import {CreateMainUserDto} from "./dto/create-main-user.dto";

@Controller('main-user')
export class MainUserController {
  constructor(private readonly mainUserService: MainUserService) {}

  @Post("create")
  async create(@Body() dto: CreateMainUserDto) {
    return this.mainUserService.createUser(dto);
  }

  @Get("all")
  async findAll() {
    return this.mainUserService.findAll();
  }

  @Get(":id")
  async findOne(@Param() id: string) {
    return this.mainUserService.findOne(id);
  }
}
