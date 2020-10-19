import { IsOptional, IsString, MinLength, MaxLength, IsArray } from 'class-validator';
import { IProjectDescription } from '../project.interfaces';

export class ProjectDescriptionDto implements IProjectDescription {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  summary?: string;

  @IsArray()
  requirements?: string[];
}
