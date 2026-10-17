import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { RoadmapDto } from '@kia./shared';
import { AssessmentAnswersDto } from '../../assessments/dto/create-assessment.dto';

export class CreateRoadmapDto implements RoadmapDto {
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @ValidateNested()
  @Type(() => AssessmentAnswersDto)
  answers!: AssessmentAnswersDto;
}
