import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { CourseExamKind, CourseExamQuestion } from '@kia./shared';

class AdminCourseExamQuestionDto implements CourseExamQuestion {
  @IsString()
  id!: string;

  @IsIn(['single_choice', 'multi_choice'])
  type!: 'single_choice' | 'multi_choice';

  @IsString()
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @IsObject({ each: true })
  options!: Array<{ id: string; label: string }>;

  /** Accept seed-style string answers or multi-choice string[]. */
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  answer!: string | string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;
}

export class AdminCreateCourseExamDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsIn(['MIDTERM', 'FINAL'])
  kind?: CourseExamKind;

  /** Anchor lesson: the exam is placed right after this lesson. Null = end of course. */
  @IsOptional()
  @IsString()
  afterLessonId?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  durationMin?: number;

  /** EXAM-4: how many graded attempts a learner may take (1–10). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCourseExamQuestionDto)
  questions?: AdminCourseExamQuestionDto[];
}

export class AdminUpdateCourseExamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['MIDTERM', 'FINAL'])
  kind?: CourseExamKind;

  @IsOptional()
  @IsString()
  afterLessonId?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  durationMin?: number;

  /** EXAM-4: how many graded attempts a learner may take (1–10). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCourseExamQuestionDto)
  questions?: AdminCourseExamQuestionDto[];
}

/** Ordered list of lesson slugs to persist as the course's lesson order. */
export class ReorderLessonsDto {
  @IsArray()
  @IsString({ each: true })
  slugs!: string[];
}

/** Ordered list of course slugs to persist as the catalog order. */
export class ReorderCoursesDto {
  @IsArray()
  @IsString({ each: true })
  slugs!: string[];
}

export class SaveCourseExamAnswersDto {
  @IsObject()
  answers!: Record<string, unknown>;
}
