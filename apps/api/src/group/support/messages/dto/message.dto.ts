import { IsString, Length, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { containsProgrammingCode } from '@kia./shared';

@ValidatorConstraint({ name: 'NoProgrammingCodeMessage', async: false })
class NoProgrammingCodeMessageConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    return typeof value === 'string' && !containsProgrammingCode(value);
  }

  defaultMessage() {
    return 'Programming code is not allowed in messages';
  }
}

export class CreateLearnerMessageDto {
  @IsString()
  @Length(1, 64)
  userId!: string;

  @IsString()
  @Length(3, 160)
  @Validate(NoProgrammingCodeMessageConstraint)
  subject!: string;

  @IsString()
  @Length(1, 5000)
  @Validate(NoProgrammingCodeMessageConstraint)
  body!: string;
}
