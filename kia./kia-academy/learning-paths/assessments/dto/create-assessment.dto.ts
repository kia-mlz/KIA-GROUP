import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  AssessmentAnswers,
  Goal,
  Interest,
  LearningStyle,
  SkillLevel,
} from '@kia./shared';

const GOALS = ['job', 'startup', 'freelance', 'fun'] as const;
const STYLES = ['video', 'reading', 'building'] as const;

export class PersonalityAnswersDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  teamwork!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  pace!: number;
}

export class AssessmentAnswersDto implements AssessmentAnswers {
  @IsOptional()
  @IsEnum(GOALS)
  goal!: Goal | null;

  @IsObject()
  skills!: Record<string, SkillLevel>;

  @ValidateNested()
  @Type(() => PersonalityAnswersDto)
  personality!: PersonalityAnswersDto;

  @IsArray()
  @IsString({ each: true })
  interests!: Interest[];

  @IsOptional()
  @IsEnum(STYLES)
  style!: LearningStyle | null;

  @IsNumber()
  @Min(1)
  @Max(40)
  hours!: number;
}

export class CreateAssessmentDto {
  @ValidateNested()
  @Type(() => AssessmentAnswersDto)
  answers!: AssessmentAnswersDto;
}
