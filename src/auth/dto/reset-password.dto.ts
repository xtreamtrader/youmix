import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Match } from 'src/common/decorators/match-validator.decorator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(26)
  @Matches(/^(?!=.* )(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).*$/, {
    message:
      'Password must have a least one lowercase charater(a-z), 1 uppercase character(A-Z), 1 number(0-9) and must not contain space',
  })
  newPassword: string;

  @IsNotEmpty()
  @Match('newPassword', {
    message: 'Password confirmation and password must be the same',
  })
  newPasswordConfirmation: string;
}
