import { Module, Logger } from '@nestjs/common';
import { SeedsService } from './seeds.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { AppModule } from 'src/app.module';
import { typeOrmConfig } from 'src/config';
import { Profile } from 'src/profile/profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile]),
    TypeOrmModule.forRoot(typeOrmConfig),
  ],
  providers: [SeedsService, Logger],
})
export class SeedsModule {}
