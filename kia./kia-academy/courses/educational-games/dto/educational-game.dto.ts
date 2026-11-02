import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  EDUCATIONAL_GAME_TYPES,
  GAME_DIFFICULTIES,
  GAME_PUBLISH_STATUSES,
  GRADING_STRATEGIES,
} from '@kia./shared';

export class GameStageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mission?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  sortOrder?: number;

  @IsString()
  @IsIn([...GRADING_STRATEGIES])
  challengeType!: string;

  @IsObject()
  challengeConfig!: Record<string, unknown>;

  @IsObject()
  gradingConfig!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  hints?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  points?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7200)
  timeLimitSec?: number | null;
}

export class UpsertEducationalGameDto {
  @IsString()
  lessonId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  learningGoal?: string;

  @IsIn([...EDUCATIONAL_GAME_TYPES])
  type!: (typeof EDUCATIONAL_GAME_TYPES)[number];

  @IsOptional()
  @IsIn([...GAME_DIFFICULTIES])
  difficulty?: (typeof GAME_DIFFICULTIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  estimatedMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  points?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  prerequisiteGameId?: string | null;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsIn([...GAME_PUBLISH_STATUSES])
  publishStatus?: (typeof GAME_PUBLISH_STATUSES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => GameStageDto)
  stages?: GameStageDto[];
}

export class UpdateEducationalGameDto {
  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  learningGoal?: string;

  @IsOptional()
  @IsIn([...EDUCATIONAL_GAME_TYPES])
  type?: (typeof EDUCATIONAL_GAME_TYPES)[number];

  @IsOptional()
  @IsIn([...GAME_DIFFICULTIES])
  difficulty?: (typeof GAME_DIFFICULTIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  estimatedMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  points?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  prerequisiteGameId?: string | null;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsIn([...GAME_PUBLISH_STATUSES])
  publishStatus?: (typeof GAME_PUBLISH_STATUSES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => GameStageDto)
  stages?: GameStageDto[];
}

export class ReorderGamesDto {
  @IsString()
  lessonId!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];
}

export class SubmitStageDto {
  @Allow()
  @IsDefined()
  answer!: unknown;
}

export class HintDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7)
  index!: number;
}

export class CreateChapterDto {
  @IsString()
  courseId!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class AssignChapterDto {
  @IsOptional()
  @IsString()
  chapterId?: string | null;
}
