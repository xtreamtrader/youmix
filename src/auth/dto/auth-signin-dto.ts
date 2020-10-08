import { IsAlphanumeric, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class AuthSignInUserDto {
  @IsNotEmpty()
  @IsAlphanumeric()
  @Transform((username: string) => username.toLowerCase().trim())
  username: string;

  @IsNotEmpty()
  password: string;
}
