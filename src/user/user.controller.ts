import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async getAllUsers(@Query() query: any): Promise<User[]> {
    console.log(query);
    return await this.userService.findAll();
  }

  @Get('/me')
  async getMe(@GetUser() user: User): Promise<User> {
    return await this.userService.findOneById(user.id);
  }

  @Get(':id')
  async getUser(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return await this.userService.findOneById(id);
  }

  @Patch(':id')
  async updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
    @GetUser() user: User,
  ): Promise<void> {
    return await this.userService.updatePassword(
      id,
      updateUserPasswordDto,
      user,
    );
  }

  @Delete(':id')
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<void> {
    return await this.userService.deleteOne(id, user);
  }
}
