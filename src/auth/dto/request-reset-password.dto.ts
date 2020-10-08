import {
  IsNotEmpty,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestResetPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  @Transform((email: string) => email.toLowerCase().trim())
  email: string;
}
