import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthSignUpUserDto } from 'src/auth/dto/auth-signup-dto';
import { UserService } from 'src/user/user.service';
import { AuthSignInUserDto } from './dto/auth-signin-dto';
import { JwtService } from '@nestjs/jwt';
import {
  ITokenResult,
  ETokenStatus,
} from 'src/common/interfaces/jwt.extended.types';
import { MailerService } from 'src/mailer/mailer.service';
import { refreshTokenConfig, jwtConfig } from 'src/config';
import { RedisService } from 'src/redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Create new account correspoding to normal user's SignUp Activity.
   *
   * Send an email contains a link to redirect user to verification-account page
   * @param authSignUpUserDto
   */
  async signup(authSignUpUserDto: AuthSignUpUserDto): Promise<ITokenResult> {
    const userWithToken = await this.userService.create(authSignUpUserDto);

    const { entity: user, token } = userWithToken;

    this.mailerService.sendMail(
      user.email,
      this.mailerService.createSignUpVerificationToken(user.id, token),
    );

    // TODO Refactor into Helpers
    // Parallelly generate accessToken and refresh token and assign the result
    // to corresponding variable by destruction after the execution completes
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({
        id: user.id,
        role: user.role,
        username: user.username,
      }),

      this.jwtService.signAsync(
        {
          id: user.id,
        },
        refreshTokenConfig,
      ),
    ]);

    // Hash the generated refreshToken before saving it into Redis
    const hashedRefreshToken = this.hashRefreshToken(refreshToken);

    // Save the hashed version of refreshToken with auto-genrated prefix into Redis
    // Expires time is equal to refreshToken's global configuration
    await this.redisService.setUserIdWithHashedRefreshToken(
      hashedRefreshToken,
      user.id,
      refreshTokenConfig.expiresIn as number,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate and return a pair of accessToken and Refresh Token if user log in successfully
   */
  async signIn({
    username,
    password,
  }: AuthSignInUserDto): Promise<ITokenResult> {
    try {
      const user = await this.userService.findOneByUsername(username);

      // Compare already hashed password with the plain password coming from the request
      if (!(await this.userService.comparePassword(password, user.password))) {
        throw new UnauthorizedException({
          message: 'Either your username or password was incorrect',
          type: 'INVALID_USERNAME_PASSWORD',
        });
      }

      // TODO Refactor Token into Helpers
      // Parallelly generate accessToken and refresh token and assign the result
      // to corresponding variable by destruction after this execution completes
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync({
          id: user.id,
          role: user.role,
          username: user.username,
        }),

        this.jwtService.signAsync(
          {
            id: user.id,
          },
          refreshTokenConfig,
        ),
      ]);

      // Hash the generated refreshToken before saving it into Redis
      const hashedRefreshToken = this.hashRefreshToken(refreshToken);

      // Save the hashed version of refreshToken with auto-genrated prefix into Redis
      // Expires time is equal to refreshToken's global configuration
      await this.redisService.setUserIdWithHashedRefreshToken(
        hashedRefreshToken,
        user.id,
        refreshTokenConfig.expiresIn as number,
      );

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      // console.log(error);

      // TODO Filtering the exception: If the error were come from RedisService, throw an InteralServer instead
      throw new UnauthorizedException({
        message: 'Either your username or password was incorrect',
        type: 'INVALID_USERNAME_PASSWORD',
      });
    }
  }

  /**
   * Used for changing user's status from NOTVERIFIED to active
   * @param userId
   * @param token
   */
  async verifyToken(userId: string, token: string): Promise<void> {
    this.userService.updateUserByToken(userId, token);
  }

  /**
   * Used for updating user password after asking for a password recovery
   * @param userId
   * @param token
   * @param newPassword
   */
  async resetPassword(
    userId: string,
    token: string,
    newPassword: string,
  ): Promise<void> {
    this.userService.updateUserByToken(userId, token, newPassword);
  }

  /**
   * Update user with new verificationToken and send plain token to user's email
   * @param email
   */
  async requestResetPassword(email: string): Promise<void> {
    const {
      entity: user,
      token,
    } = await this.userService.updateUserVerificationToken(email);

    this.mailerService.sendMail(
      email,
      this.mailerService.createRequestResetPasswordVerificationToken(
        user.id,
        user.username,
        token,
      ),
    );
  }

  async generateAccessTokenFromRefreshToken(
    refreshToken: string,
  ): Promise<ITokenResult> {
    const hashedRefreshToken = this.hashRefreshToken(refreshToken);

    const { iat, exp } = this.jwtService.decode(refreshToken) as any;

    // Throw error if refreshToken has already been expired
    if (exp < +new Date() / 1000) {
      throw new UnauthorizedException({
        message: 'This refresh has been expired. Please login again',
        type: ETokenStatus.REFRESH_TOKEN_EXPIRED,
      });
    }

    const userId = await this.redisService.getUserIdFromRefreshToken(
      hashedRefreshToken,
    );

    if (!userId)
      throw new UnauthorizedException({
        message: 'This refresh has been expired. Please login again',
        type: ETokenStatus.REFRESH_TOKEN_EXPIRED,
      });

    // TODO Refactor to centralized helper class
    const latestUserUpdatedTime = await this.redisService.getCredentialsUserChangedByUnixTimestamp(
      userId,
    );

    if (iat < +latestUserUpdatedTime)
      throw new UnauthorizedException({
        message:
          'This refresh token has been expired. Please refreshToken to generate a new one or login again',
        type: ETokenStatus.REFRESH_TOKEN_EXPIRED,
      });

    const user = await this.userService.findOneById(userId);

    return {
      accessToken: await this.jwtService.signAsync({
        id: user.id,
        role: user.role,
        username: user.username,
      }),
    };
  }

  async logout(accessToken: string): Promise<void> {
    await this.redisService.setBannedAccessToken(
      accessToken,
      jwtConfig.signOptions.expiresIn as number,
    );
  }

  private hashRefreshToken(refreshToken: string): string {
    return crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('base64');
  }

  private validateRefreshToken(
    candidateToken: string,
    hashedToken: string,
  ): boolean {
    return this.hashRefreshToken(candidateToken) === hashedToken;
  }
}
