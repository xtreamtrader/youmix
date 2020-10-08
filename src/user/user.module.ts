import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Profile } from 'src/profile/profile.entity';
import { ProfileService } from 'src/profile/profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Profile])],
  providers: [UserService, ProfileService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
