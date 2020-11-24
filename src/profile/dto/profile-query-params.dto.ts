import { TApiFeaturesDto } from 'src/common/interfaces/api-features';
import { Profile } from '../profile.entity';
import {
  IsOptional,
  IsAlphanumeric,
  IsNumber,
  IsNumberString,
  IsArray,
  IsString,
} from 'class-validator';
import { Transform, Expose, Exclude } from 'class-transformer';
import { IsStringOrArray } from 'src/common/decorators/string-or-array-validator.decorator';
import { IsNumberStringOrArray } from 'src/common/decorators/number-string-or-array-validator.decorator';

export class ProfileQueryParamsDto implements TApiFeaturesDto<Profile> {
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
  @IsStringOrArray()
  createdAt?: any;

  @IsOptional()
  @IsStringOrArray()
  fullname?: any;

  @IsOptional()
  @IsStringOrArray()
  gender?: any;

  @IsOptional()
  @IsStringOrArray()
  expertises?: any;

  @IsOptional()
  @IsStringOrArray()
  position?: any;

  @IsOptional()
  @IsStringOrArray()
  major?: any;

  @IsOptional()
  @IsStringOrArray()
  studentId?: any;

  @Expose({ name: 'age', toClassOnly: true })
  @IsOptional()
  @IsNumberStringOrArray()
  @Transform((value, obj) => {
    const toYear = (val: string) => new Date().getFullYear() - parseInt(val);
    const toNumeric = (val: string) => parseInt(val);

    let mergedArr = [];
    const { age, yearBorn } = obj;

    if (age) {
      mergedArr = Array.isArray(age) ? age.map(toYear) : [toYear(age)];
    }

    if (yearBorn) {
      mergedArr = [
        ...mergedArr,
        ...(Array.isArray(yearBorn)
          ? yearBorn.map(toNumeric)
          : [toNumeric(yearBorn)]),
      ];
    }

    return mergedArr;
  })
  yearBorn?: any;
}
