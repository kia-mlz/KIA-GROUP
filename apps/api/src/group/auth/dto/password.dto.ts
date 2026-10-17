import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type {
  ChangePasswordDto as ChangePasswordDtoType,
  ForgotPasswordDto as ForgotPasswordDtoType,
  ResetPasswordDto as ResetPasswordDtoType,
} from '@kia./shared';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class ForgotPasswordDto implements ForgotPasswordDtoType {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto implements ResetPasswordDtoType {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message: 'Password must be at least 8 characters and contain a letter and a number',
  })
  password!: string;

  @IsString()
  passwordConfirm!: string;

  /**
   * AUTH-6 companion: `verify` marks a mailbox-ownership confirmation link
   * (consumes the token and flips emailVerified; password still required to
   * set a credential). Omitted → classic password reset.
   */
  @IsOptional()
  @IsIn(['reset', 'verify'])
  type?: 'reset' | 'verify';
}

export class ChangePasswordDto implements ChangePasswordDtoType {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, {
    message: 'Password must be at least 8 characters and contain a letter and a number',
  })
  newPassword!: string;
}
