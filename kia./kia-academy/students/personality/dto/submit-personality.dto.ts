import { IsObject } from 'class-validator';

export class SubmitPersonalityDto {
  @IsObject()
  answers!: Record<string, number>;
}
