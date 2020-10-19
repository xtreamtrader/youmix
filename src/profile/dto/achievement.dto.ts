import { IAchievement } from '../profile.interfaces';
import {
  IsString,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class Achievement implements IAchievement {
  @IsString()
  @MinLength(10)
  @MaxLength(50)
  detail: string;

  @IsNumber()
  @Min(1950)
  @Max(2020)
  year: number;
}
