import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SiteAdminAccessDto,
} from '@kia./platform';

export class AdminCreateUserDto {
  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class AdminCreateLessonDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  contentEn?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  comingSoon?: boolean;
}

export class AdminCreateCourseDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  trackKey?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  /** "Coming soon" — visible in listings but locked with no content access. */
  @IsOptional()
  @IsBoolean()
  comingSoon?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminCreateLessonDto)
  lessons?: AdminCreateLessonDto[];
}

export class AdminUpdateCourseDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  trackKey?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  comingSoon?: boolean;
}

export class AdminCreateChallengeDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  starterCode?: string;
}

export class AdminUpdateChallengeDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  starterCode?: string;
}

export class AdminUpdateUserRoleDto {
  @IsString()
  role!: string;
}

export class AdminCreateRoleDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteAdminAccessDto)
  access?: SiteAdminAccessDto;
}

export class AdminUpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteAdminAccessDto)
  access?: SiteAdminAccessDto;
}

export class AdminUpdateUserAccessDto {
  @ValidateNested()
  @Type(() => SiteAdminAccessDto)
  adminPanelAccess!: SiteAdminAccessDto;
}

export class AdminUpdateUserStatusDto {
  @IsIn(['ACTIVE', 'SUSPENDED', 'BANNED'])
  status!: 'ACTIVE' | 'SUSPENDED' | 'BANNED';

  /** Required (server-side) when the new status is SUSPENDED or BANNED. */
  @IsOptional()
  @IsString()
  reason?: string;
}

/** DB-4 soft delete — reason is mandatory for the audit trail. */
export class AdminSoftDeleteUserDto {
  @IsString()
  reason!: string;
}

export class AdminUpdateLessonDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  contentEn?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  comingSoon?: boolean;
}

export class AdminReplyTicketDto {
  @IsString()
  body!: string;
}

export class AdminUpdateTicketDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

export class AdminSendMessageDto {
  @IsString()
  userId!: string;

  @IsString()
  subject!: string;

  @IsString()
  body!: string;
}

export class AdminCreateCompetitionDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdminUpdateCompetitionDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AdminGrantEntitlementDto {
  @IsString()
  userId!: string;

  /**
   * Canonical values map to the EntitlementResourceType enum; the legacy
   * admin-form labels (`readiness_test`/`roadmap_bundle`) are accepted and
   * normalized server-side so existing clients keep working.
   */
  @IsIn(['course', 'readiness', 'roadmap', 'readiness_test', 'roadmap_bundle'])
  resourceType!: string;

  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsIn(['PURCHASE', 'CHALLENGE', 'BUNDLE', 'FREE'])
  source?: 'PURCHASE' | 'CHALLENGE' | 'BUNDLE' | 'FREE';
}

export class AdminAdjustWalletDto {
  @IsIn(['CREDIT', 'DEBIT'])
  type!: 'CREDIT' | 'DEBIT';

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  description?: string;

    /** Required (server-side) — every manual money movement must state why. */
  @IsString()
  reason!: string;
}

/**
 * Full or partial refund initiated by an admin. For a full refund omit
 * `amountCents` (or pass the full payment amount); for a partial refund
 * provide the amount to return and the payment transitions to PARTIALLY_REFUNDED.
 */
export class RefundPaymentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  /** Required — admin must justify the refund for the audit trail. */
  @IsString()
  reason!: string;
}

export class AdminCreateDiscountCodeDto {
  @IsString()
  @MinLength(3)
  code!: string;

  @IsIn(['PERCENT', 'FIXED'])
  type!: 'PERCENT' | 'FIXED';

  /** Percent (1-100) for PERCENT, flat IRR amount for FIXED. */
  @IsInt()
  @Min(1)
  value!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSubtotalCents?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseSlugs?: string[];
}

/**
 * Partial update. Nullable fields accept `null` to clear them (unlimited uses,
 * all courses, no date window) — the admin form relies on this to undo limits.
 */
export class AdminUpdateDiscountCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  code?: string;

  @IsOptional()
  @IsIn(['PERCENT', 'FIXED'])
  type?: 'PERCENT' | 'FIXED';

  @IsOptional()
  @IsInt()
  @Min(1)
  value?: number;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSubtotalCents?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseSlugs?: string[] | null;
}
