import { IsEmail, IsString, Matches } from 'class-validator';
import type { LoginDto as LoginDtoType } from '@kia./shared';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class LoginDto implements LoginDtoType {
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message: 'Password must be at least 8 characters and contain a letter and a number',
  })
  password!: string;
}
