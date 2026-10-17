import { IsNumber, IsObject, Min } from 'class-validator';
import type { ModuleScore, ReadinessScores, ReadinessTestDto } from '@kia./shared';

export class ModuleScoreDto implements ModuleScore {
  @IsNumber()
  @Min(0)
  correct!: number;

  @IsNumber()
  @Min(1)
  total!: number;
}

export class CreateReadinessTestDto implements ReadinessTestDto {
  @IsObject()
  scores!: ReadinessScores;
}
