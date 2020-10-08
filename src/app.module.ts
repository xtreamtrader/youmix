import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { AwsModule } from './aws/aws.module';
import { FileModule } from './file/file.module';
import { MailerModule } from './mailer/mailer.module';
import { RedisModule } from './redis/redis.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtRedisGuard } from './common/guards/jwtRedis.guard';
import { SeedsModule } from './seeds/seeds.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    UserModule,
    AuthModule,
    ProfileModule,
    AwsModule,
    FileModule,
    MailerModule,
    RedisModule,
    SeedsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtRedisGuard,
    },
  ],
})
export class AppModule {}
