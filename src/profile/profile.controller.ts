import {
  Controller,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Get,
  Param,
  Patch,
  Body,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateOrUpdateProfileDto } from './dto/create-update-profile.dto';
import { Profile } from './profile.entity';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { User } from 'src/user/user.entity';
import { JwtRedisGuard } from 'src/common/guards/jwtRedis.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { TApiFeaturesDto, WithMeta } from 'src/common/interfaces/api-features';
import { plainToClass } from 'class-transformer';
import { ProfileQueryParamsDto } from './dto/profile-query-params.dto';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Public()
  @Get('/demo')
  async getDemoProfiles(): Promise<Profile[]> {
    return await this.profileService.findAll();
  }

  @Patch()
  async updateOwn(
    @Body() createOrUpdateProfileDto: CreateOrUpdateProfileDto,
    @GetUser() user: User,
  ): Promise<Profile> {
    return this.profileService.updateOne(
      createOrUpdateProfileDto,
      user.username,
    );
  }

  @Public()
  @Get('/:username')
  async getProfile(@Param('username') username: string): Promise<Profile> {
    return await this.profileService.findOneByName(username);
  }

  @Get()
  async getAllProfiles(
    @GetUser() user: User,
    @Query() query: ProfileQueryParamsDto,
  ): Promise<WithMeta<Profile[]>> {
    console.log(query);
    const profilesWithMeta = await this.profileService.findAllNotMe(
      user.username,
      query,
    );

    return {
      meta: profilesWithMeta.meta,
      data: plainToClass(Profile, profilesWithMeta.data),
    };
  }
}
