import { EProfileJob, EMajor, EAccountGender } from '../profile.interfaces';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsArray,
  IsPhoneNumber,
  IsAlphanumeric,
  ArrayMaxSize,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Achievement } from './achievement.dto';
import { toCapitalize } from 'src/common/helpers/string.helper';

const profileJobRegex = new RegExp(
  `\\b(${Object.values(EProfileJob).join('|')})\\b`,
  'i',
);

const majorRegex = new RegExp(`\\b(${Object.keys(EMajor).join('|')})\\b`, 'i');

const genderRegex = new RegExp(
  `\\b(${Object.keys(EAccountGender).join('|')})\\b`,
  'i',
);

export class CreateOrUpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  @Transform(bio => bio.trim())
  bio?: string;

  @IsOptional()
  @Matches(profileJobRegex, {
    message: 'Invalid job',
  })
  @Transform(position => position.toUpperCase())
  position?: EProfileJob;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @Transform(exp => exp.map((e: string) => e.toLowerCase()))
  expertises?: string[];

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Transform(fullname => toCapitalize(fullname))
  fullname?: string;

  @IsOptional()
  @IsPhoneNumber('vn')
  phoneNumber?: string;

  @IsOptional()
  @IsAlphanumeric()
  studentId?: string;

  @IsOptional()
  @Matches(majorRegex, {
    message: 'Invalid major',
  })
  @Transform(major => major.toUpperCase())
  major?: EMajor;

  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => Achievement)
  achievements?: Achievement[];

  @IsOptional()
  @IsNumber()
  @Min(1935)
  @Max(2020)
  yearBorn?: number;

  @IsOptional()
  @Matches(genderRegex, {
    message: 'Invalid gender',
  })
  @Transform(gender => gender.toUpperCase())
  gender?: EAccountGender;

  @IsOptional()
  @MaxLength(250)
  address?: string;

  userId?: string;
}
