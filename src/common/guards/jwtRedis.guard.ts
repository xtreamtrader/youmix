import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from 'src/redis/redis.service';
import { ETokenStatus } from '../interfaces/jwt.extended.types';
import { Reflector } from '@nestjs/core';

/**
 * An extended AuthGuard to check some additional constraints related to revoking JWT concept
 * with the usage of Redis
 */
@Injectable()
export class JwtRedisGuard extends AuthGuard('jwt') {
  constructor(
    @Inject('RedisService') private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {
    super();
    console.log('calling jwtredis constructor');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isPublic = this.reflector.get<boolean>(
        'isPublic',
        context.getHandler(),
      );

      if (isPublic) return true;

      const req = context.switchToHttp().getRequest();

      const bearerToken: string = req.headers.authorization;

      if (!bearerToken || !bearerToken.startsWith('Bearer '))
        throw new UnauthorizedException();

      const accessToken = bearerToken.split('Bearer ')[1].trim();

      // If token weren't banned, call super.canActivate to
      // execute the validation pipeline from the base class
      // which was configured by Passport

      if (
        (await this.isTokenBanned(accessToken)) ||
        !(await super.canActivate(context))
      )
        throw new UnauthorizedException({
          message:
            'This access token has been expired. Please refreshToken to generate a new one or login again',
          type: ETokenStatus.ACCESS_TOKEN_EXPIRED,
        });

      return true;
    } catch (error) {
      // If the error is UnauthorizedException, which means it came from Passport JWT authentication
      // override this one by a more informative version
      if (error instanceof UnauthorizedException)
        throw new UnauthorizedException({
          message:
            'This access token has been expired or invalid. Please refreshToken to generate a new one or login again',
          type: ETokenStatus.ACCESS_TOKEN_EXPIRED,
        });

      // For other reasons, it can be a Redis's issue, throw InternalServerErrorException instead
      throw new InternalServerErrorException();
    }
  }

  /**
   * Check if the token were banned due to some specific activies (logout, user's credentials changes)
   * @param token - An access token coming from request object
   */
  private async isTokenBanned(token: string): Promise<boolean> {
    const status = await this.redisService.getBannedAccessToken(token);
    return !!status;
  }
}
