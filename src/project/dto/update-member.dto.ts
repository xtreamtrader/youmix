import {
  IsAlphanumeric,
} from 'class-validator';

export class UpdateMemberDto {
  @IsAlphanumeric()
  member: string;
}
