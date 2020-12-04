import { TApiFeaturesDto } from 'src/common/interfaces/api-features';
import { ProjectMember } from '../project-member.entity';
import {
  IsOptional,
  IsNumberString,
  Matches,
  IsString,
  MaxLength,
} from 'class-validator';
import { EProjectMemberRole } from 'src/project/project.interfaces';

const memberRoleRegex = new RegExp(
  `\\b(${Object.keys(EProjectMemberRole).join('|')})\\b`,
  'i',
);

export class SearchProjectMemberQueryParamsDto
  implements TApiFeaturesDto<ProjectMember> {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  sort?: string;

  @IsOptional()
  @Matches(memberRoleRegex, {
    message: 'Invalid role',
  })
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
