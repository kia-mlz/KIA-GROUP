import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidIranCity, isValidIranProvince } from '@kia./shared';

@ValidatorConstraint({ name: 'IranProvinceCityProfile', async: false })
class IranProvinceCityProfileConstraint implements ValidatorConstraintInterface {
  validate(_city: string, args: ValidationArguments) {
    const obj = args.object as CompleteProfileDto;
    return isValidIranProvince(obj.province) && isValidIranCity(obj.province, obj.city);
  }

  defaultMessage() {
    return 'Province and city must be a valid Iran location pair';
  }
}

export class RequestOtpDto {
  @IsString()
  @MaxLength(20)
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class CompleteProfileDto {
  @IsString()
  @Length(2, 60)
  firstName!: string;

  @IsString()
  @Length(2, 60)
  lastName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  province!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Validate(IranProvinceCityProfileConstraint)
  city!: string;

  @IsEmail()
  @MaxLength(120)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
