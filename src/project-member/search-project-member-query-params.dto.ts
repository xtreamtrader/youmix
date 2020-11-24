import { TApiFeaturesDto } from 'src/common/interfaces/api-features';
import { ProjectMember } from './project-member.entity';
import { Profile } from 'src/profile/profile.entity';
import {
  IsOptional,
  IsNumberString,
  IsAlphanumeric,
  MinLength,
  MaxLength,
  IsString,
} from 'class-validator';

export class SearchProjectMemberQueryParamsDto
  implements TApiFeaturesDto<ProjectMember & Pick<Profile, 'fullname'>> {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  sort?: string;

  @IsOptional()
  // @IsAlphanumeric()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  fullname?: string;
}
