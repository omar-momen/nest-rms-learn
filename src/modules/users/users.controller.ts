import { Controller, Get, Body, Patch, Delete } from '@nestjs/common';

import { UsersService } from './users.service';

import { UpdateUserDto } from './dto';

@Controller('users')
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
