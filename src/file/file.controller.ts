import {
  Controller,
  Put,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Param,
  ParseIntPipe,
  Delete,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { User } from 'src/user/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { File } from './file.entity';

@Controller('files')
export class FileController {
  constructor(private fileService: FileService) {}

  @Put('/photo')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('photo'))
  @UseInterceptors(ClassSerializerInterceptor)
  async uploadPhoto(
    @UploadedFile() file,
    @GetUser() user: User,
  ): Promise<File> {
    return await this.fileService.uploadPhoto(file, user);
  }

  @Delete('/photo/:id')
  @UseGuards(AuthGuard('jwt'))
  async deletePhoto(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ): Promise<void> {
    return await this.fileService.deleteOne(id, user);
  }
}
