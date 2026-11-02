import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SiteGeneralDto {
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  heroMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  heroRoadmapsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  heroMatchPercent?: number;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;
}

export class SitePricingDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  readinessTestCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  courseCents?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  modulePrices?: number[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bundleDiscountPercent?: number;
}

export class SiteTrackDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsString()
  icon!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  modules!: string[];
}

export class SiteReadinessDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passThreshold?: number;

  @IsOptional()
  @IsString()
  passTitle?: string;

  @IsOptional()
  @IsString()
  passMessage?: string;

  @IsOptional()
  @IsString()
  failTitle?: string;

  @IsOptional()
  @IsString()
  failMessage?: string;
}

export class SiteBootcampDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  unlockScoreThreshold?: number;

  @IsOptional()
  @IsString()
  unlockCourseSlug?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultRank?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultPoints?: number;
}

export class AdminSectionPermissionDto {
  @IsOptional()
  @IsBoolean()
  view?: boolean;

  @IsOptional()
  @IsBoolean()
  manage?: boolean;

  @IsOptional()
  @IsBoolean()
  edit?: boolean;
}

export class SiteAdminAccessDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  stats?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  settings?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  courses?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  challenges?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  users?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  payments?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  tests?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  discounts?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  tickets?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  messages?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  competitions?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  audit?: AdminSectionPermissionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminSectionPermissionDto)
  educationalGames?: AdminSectionPermissionDto;
}

export class SitePaymentDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['dev', 'zarinpal', 'idpay', 'stripe'])
  provider?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  sandbox?: boolean;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  failureUrl?: string;
}

export class SiteSmsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  sender?: string;

  @IsOptional()
  @IsString()
  template?: string;
}

export class SiteEnamadDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  codeId?: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class UpdateSiteSettingsBodyDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteGeneralDto)
  general?: SiteGeneralDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SitePricingDto)
  pricing?: SitePricingDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteTrackDto)
  tracks?: SiteTrackDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteReadinessDto)
  readiness?: SiteReadinessDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteBootcampDto)
  bootcamp?: SiteBootcampDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SitePaymentDto)
  payment?: SitePaymentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteSmsDto)
  sms?: SiteSmsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteEnamadDto)
  enamad?: SiteEnamadDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteAdminAccessDto)
  adminAccess?: SiteAdminAccessDto;
}
