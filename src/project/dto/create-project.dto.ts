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
  MinDate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ProjectDescriptionDto } from './project-description.dto';

export class CreateProjectDto {
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  name?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  major?: EMajor[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  expertises?: string[];

  @IsOptional()
  @Type(() => ProjectDescriptionDto)
  description?: IProjectDescription;

  @IsDate()
  @MinDate(new Date(+new Date() + 5 * 24 * 60 * 60 * 1000), {
    message:
      'Closing time must be greater than at least 5 day from created day',
  })
  @Transform(value => new Date(value))
  closeAt: Date;
}
