import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
  IsAlphanumeric,
} from 'class-validator';
import { Match } from 'src/common/decorators/match-validator.decorator';
import { Transform } from 'class-transformer';

export class AuthSignUpUserDto {
  @IsNotEmpty()
  @IsAlphanumeric()
  @MinLength(5)
  @MaxLength(20)
  @Transform((username: string) => username.toLowerCase().trim())
  username: string;

  @IsNotEmpty()
  @IsEmail()
  @Transform((email: string) => email.toLowerCase().trim())
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(26)
  @Matches(/^(?!=.* )(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).*$/, {
    message:
      'Password must have a least one lowercase charater(a-z), 1 uppercase character(A-Z), 1 number(0-9) and must not contain space',
  })
  password: string;

  @IsNotEmpty()
  @Match('password', {
    message: 'Password confirmation and password must be the same',
  })
  passwordConfirmation: string;
}
