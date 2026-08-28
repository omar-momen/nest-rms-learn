import { Get, Body, Patch, Delete } from '@nestjs/common';

import { UsersService } from './users.service';

import { ChangePasswordDto, UpdateUserDto } from './dto';

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

  @Patch('/me/password')
  changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(changePasswordDto);
  }

  @Delete('/me')
  removeMe() {
    return this.usersService.removeMe();
  }
}
