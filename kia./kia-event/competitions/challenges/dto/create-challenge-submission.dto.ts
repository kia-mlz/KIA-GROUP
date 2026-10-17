import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { ChallengeSubmissionDto } from '@kia./shared';

export class CreateChallengeSubmissionDto implements ChallengeSubmissionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100_000)
  code!: string;

  /** Challenge id (cuid) or slug. Resolved server-side; forwarded as the FK. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  challengeId?: string;

  /** Source language. Only JavaScript is supported for the bootcamp challenge. */
  @IsOptional()
  @IsIn(['js'])
  language?: 'js';

  /**
   * Execution result reported by the client sandbox. NEVER trusted for the
   * score or unlock decision — the score is recomputed server-side. These are
   * stored only as informational telemetry.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  executionTimeMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  memoryUsageKb?: number;
}
