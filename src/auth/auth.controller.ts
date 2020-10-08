import {
  Controller,
  Post,
  Body,
  HttpCode,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthSignUpUserDto,
  AuthSignInUserDto,
  ResetPasswordDto,
  RequestResetPasswordDto,
  RefreshTokenDto,
} from './dto';
import { ITokenResult } from 'src/common/interfaces/jwt.extended.types';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  @Public()
  async signUp(@Body() authSignUpUserDto: AuthSignUpUserDto): Promise<ITokenResult> {
    return await this.authService.signup(authSignUpUserDto);
  }

  @Post('/signin')
  @Public()
  @HttpCode(200)
  async signIn(
    @Body() authSignInUserDto: AuthSignInUserDto,
  ): Promise<ITokenResult> {
    return await this.authService.signIn(authSignInUserDto);
  }

  @Post('/refreshtoken')
  @Public()
  @HttpCode(200)
  async refreshToken(
    @Body() refreshTokenDto: any,
  ): Promise<ITokenResult> {
    return await this.authService.generateAccessTokenFromRefreshToken(
      refreshTokenDto.refreshToken,
    );
  }

  @Get('/verification/:userId/:token')
  @Public()
  async verifyToken(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('token') token: string,
  ): Promise<any> {
    await this.authService.verifyToken(userId, token);
    return {
      message: 'Verify successfully',
    };
  }

  @Post('/verification/:userId/:token')
  @Public()
  @HttpCode(200)
  async resetPassword(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<any> {
    await this.authService.resetPassword(
      userId,
      token,
      resetPasswordDto.newPassword,
    );
    return {
      message: 'Password update successfully',
    };
  }

  // TODO Apply rate limit for this route
  @Post('/resetpassword')
  @Public()
  async requestResetPassword(
    @Body() requestResetPasswordDto: RequestResetPasswordDto,
  ): Promise<void> {
    return await this.authService.requestResetPassword(
      requestResetPasswordDto.email,
    );
  }
}
