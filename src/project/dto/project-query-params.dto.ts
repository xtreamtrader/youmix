import { TApiFeaturesDto } from "src/common/interfaces/api-features";
import { Project } from "../project.entity";
import { IsOptional, IsNumberString, IsString, IsDateString } from "class-validator";
import { IsStringOrArray } from "src/common/decorators/string-or-array-validator.decorator";
import { EMajor } from "src/profile/profile.interfaces";
import { EProjectStatus } from "../project.interfaces";

export class ProjectQueryParamsDto implements TApiFeaturesDto<Project> {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  sort?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsStringOrArray()
  major?: EMajor[]

  @IsOptional()
  @IsStringOrArray()
  expertises?: string[]

  @IsOptional()
  @IsStringOrArray()
  status?: EProjectStatus;

  @IsOptional()
  @IsDateString()
  createdAt?: any;
}