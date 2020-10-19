import { EMajor } from 'src/profile/profile.interfaces';
import { IProjectDescription } from '../project.interfaces';
import {
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectDescriptionDto } from './project-description.dto';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  major?: EMajor[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  expertises?: string[];

  @IsOptional()
  @Type(() => ProjectDescriptionDto)
  description?: IProjectDescription;

  @IsOptional()
  @IsDate()
  @Min(+new Date() + 5 * 24 * 60 * 60 * 1000, {
    message: 'Closing time must be greate than at least 5 day from created day',
  })
  closeAt: Date;
}
