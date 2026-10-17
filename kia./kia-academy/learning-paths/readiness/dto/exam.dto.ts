import { IsObject, IsOptional, IsString } from 'class-validator';

export class StartExamDto {
  @IsOptional()
  @IsString()
  roadmapId?: string;
}

export class SaveExamAnswersDto {
  @IsObject()
  answers!: Record<string, unknown>;
}

export class SubmitExamDto {
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;
}
