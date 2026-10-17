import { IsIn, IsOptional, IsString, Length, MaxLength, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { containsProgrammingCode } from '@kia./shared';

@ValidatorConstraint({ name: 'NoProgrammingCode', async: false })
class NoProgrammingCodeConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    return typeof value === 'string' && !containsProgrammingCode(value);
  }

  defaultMessage() {
    return 'Programming code is not allowed in support messages';
  }
}

export class CreateTicketDto {
  @IsString()
  @Length(3, 160)
  @Validate(NoProgrammingCodeConstraint)
  subject!: string;

  @IsString()
  @Length(10, 5000)
  @Validate(NoProgrammingCodeConstraint)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  courseSlug?: string;

  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;
}

export class TicketReplyDto {
  @IsString()
  @Length(1, 5000)
  @Validate(NoProgrammingCodeConstraint)
  body!: string;
}
