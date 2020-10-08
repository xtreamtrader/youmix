import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { File } from './file.entity';
import { Repository } from 'typeorm';
import { AWSService } from 'src/aws/aws.service';
import { assignPartialObjectToEntity } from 'src/common/helpers/entity.helper';
import { User } from 'src/user/user.entity';
import { EAccountRole } from 'src/common/interfaces/account-role.interface';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(File) private fileRepository: Repository<File>,
    private readonly awsService: AWSService,
  ) {}

  async uploadPhoto(file: any, user: User): Promise<File> {
    const uploadResult = await this.awsService.upload({
      ...file,
      directory: 'photo',
    });

    const newFile = new File();

    assignPartialObjectToEntity(newFile, uploadResult);

    newFile.userId = user.id;

    return this.fileRepository.save(newFile);
  }

  async deleteOne(fileId: number, user: User): Promise<void> {
    const file = await this.findOne(fileId);

    if (file.userId !== user.id && user.role !== EAccountRole.ADMIN)
      throw new ForbiddenException();

    // Delete file from s3
    try {
      await this.awsService.deleteOneFile(file);

      await this.fileRepository.softDelete(file)
    } catch (error) {
      // check if file not found in s3, if true, delete in db also
      if (error.code === 'NotFound') {
        console.log('file not found, still remove');
        await this.fileRepository.softDelete(file)
        return;
      }

      // Throw InternalServerError for other cases
      throw new InternalServerErrorException();
    }
  }

  async findOne(fileId: number): Promise<File> {
    const file = await this.fileRepository.findOne({
      id: fileId,
    });

    if (!file) throw new NotFoundException(`No file found with id ${fileId}`);

    return file;
  }
}
