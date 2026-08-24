import { Get, Body, Patch, Delete } from '@nestjs/common';

import { UsersService } from './users.service';

import { UpdateUserDto } from './dto';

import { AppController } from '@/modules/auth/decorators/app-controller.decorator';

@AppController('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  findMe() {
    return this.usersService.findMe();
  }

  @Patch('/me')
  updateMe(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMe(updateUserDto);
  }

  @Delete('/me')
  removeMe() {
    return this.usersService.removeMe();
  }
}
