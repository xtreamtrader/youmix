import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { PassportModule } from '@nestjs/passport';
import { passportConfig } from 'src/config/passport.config';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfig } from 'src/config/jwt.config';
import { JwtStrategy } from './jwt.strategy';
import { ProfileService } from 'src/profile/profile.service';
import { Profile } from 'src/profile/profile.entity';
import { MailerService } from 'src/mailer/mailer.service';
import { RedisService } from 'src/redis/redis.service';

console.log(jwtConfig);

@Module({
  imports: [
    PassportModule.register(passportConfig),
    JwtModule.register(jwtConfig),
    TypeOrmModule.forFeature([User, Profile]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    JwtStrategy,
    ProfileService,
    MailerService,
    RedisService,
  ],
  // exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
