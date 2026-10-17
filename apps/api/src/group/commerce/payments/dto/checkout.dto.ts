import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import type { CheckoutDto, ProductType } from '@kia./shared';

const PRODUCT_TYPES = ['READINESS_TEST', 'ROADMAP_BUNDLE', 'COURSE'] as const;

export class CheckoutBodyDto implements CheckoutDto {
  @IsOptional()
  @IsEnum(PRODUCT_TYPES)
  productType?: ProductType;

  @IsOptional()
  @IsString()
  productRef?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  courseSlugs?: string[];

  @IsOptional()
  @IsBoolean()
  fromCart?: boolean;
}
