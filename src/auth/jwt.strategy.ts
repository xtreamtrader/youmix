import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from 'src/config/jwt.config';
import { UserService } from 'src/user/user.service';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { User } from 'src/user/user.entity';
import {
  IJwtUser,
  ETokenStatus,
} from 'src/common/interfaces/jwt.extended.types';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('RedisService') private readonly redisService: RedisService,
    // private userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConfig.secret,
    });
  }

  async validate(payload: IJwtUser): Promise<Partial<User>> {
    try {
      const { id, role, username, iat } = payload;

      // Solution 1: Make a DB Lookup to get user's data
      // Drawback: this query has to be executed any time a request gets sent from a client
      // const user = await this.userService.findOneById(payload.id);
      // /** some logic to validate for user's modification */
      // return user

      // Solution 2: check the redis table to fetch latest user updated time
      // Return the payload if the token was issued after this time, otherwise
      // throw UnauthorizedException
      const latestUserUpdatedTime = await this.redisService.getCredentialsUserChangedByUnixTimestamp(
        id,
      );

      if (iat < +latestUserUpdatedTime)
        throw new UnauthorizedException({
          message:
            'This access token has been expired. Please refreshToken to generate a new one or login again',
          type: ETokenStatus.ACCESS_TOKEN_EXPIRED,
        });

      const user = { id, role, username };

      return user;
    } catch (err) {
      throw new UnauthorizedException({
        message:
          'This access token has been expired. Please refreshToken to generate a new one or login again',
        type: ETokenStatus.ACCESS_TOKEN_EXPIRED,
      });
    }
  }
}
