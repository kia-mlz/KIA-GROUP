import type { UserRole } from './auth';
import type { SiteAdminAccessSettings } from './site-settings';

export interface AdminStats {
  users: number;
  courses: number;
  lessons: number;
  enrollments: number;
  payments: number;
  revenueCents: number;
  challenges: number;
  activeChallenges: number;
}

export interface AdminLesson {
  id: string;
  slug: string;
  title: string;
  content: string;
  /** English lesson body used when the learner switches to English. */
  contentEn?: string | null;
  videoUrl: string | null;
  durationMin: number;
  sortOrder: number;
  comingSoon: boolean;
}

export interface AdminCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** English course description used when the learner switches to English. */
  descriptionEn?: string | null;
  icon: string;
  trackKey: string | null;
  sortOrder: number;
  published: boolean;
  comingSoon: boolean;
  lessonCount?: number;
  lessons?: AdminLesson[];
}

export interface AdminChallenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  points: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  starterCode: string;
}

export interface AdminUser {
  id: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  province?: string | null;
  city?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  email: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  role: UserRole;
  profileComplete?: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Account status: ACTIVE by default; SUSPENDED/BANNED users cannot sign in. */
  status: AdminUserStatus;
  suspendedAt?: string | null;
  /** Admin-provided reason when suspended or banned. */
  suspendedReason?: string | null;
  adminPanelAccess?: SiteAdminAccessSettings | null;
  /** DB-4 soft delete: true when the account is deleted but still restorable. */
  deleted?: boolean;
  /** Whether staff 2FA is enabled (secret never exposed). */
  twoFactorEnabled?: boolean;
}

/** Learner/staff account status managed from the admin panel. */
export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export type AdminUpdateUserStatusDto = {
  status: AdminUserStatus;
  /** Required when suspending or banning — stored on the user and in the audit log. */
  reason?: string;
};

/** Server-paginated users list (admin). */
export interface AdminUserList {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: AdminUserStatus | '';
  /**
   * DB-4 soft-delete view. 'active' (default) hides deleted accounts — the
   * behaviour the panel had before the filter existed — while 'deleted' and
   * 'all' surface them so a mistaken deletion can be audited and reversed.
   */
  deleted?: 'active' | 'deleted' | 'all';
}

/* --- Audit log (Admin → Audit) ---------------------------------------------- */

/** Immutable admin audit trail entry. Written by the API; never editable via the panel. */
export interface AdminAuditLog {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  section: string;
  entityType: string;
  entityId: string | null;
  /** Human-readable target label, e.g. course title or user email. */
  target: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface AdminAuditLogList {
  items: AdminAuditLog[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

export interface AdminAuditLogParams {
  page?: number;
  limit?: number;
  section?: string;
  action?: string;
  actorId?: string;
  search?: string;
  from?: string;
  to?: string;
}

/** A role definition: system roles are built-in, custom roles are admin-managed. */
export interface AdminRole {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  /** Panel access template applied to users holding this role. */
  access: SiteAdminAccessSettings | null;
}

export interface CreateRoleDto {
  /** Unique role key stored on users (e.g. "support"). */
  key: string;
  /** Human-readable display name. */
  name: string;
  access?: SiteAdminAccessSettings;
}

export type UpdateRoleDto = Partial<Pick<CreateRoleDto, 'name' | 'access'>>;

export interface AdminCreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

export interface AdminPayment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  productType: string;
  productRef: string | null;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface CreateCourseDto {
  slug: string;
  title: string;
  description: string;
  descriptionEn?: string;
  icon?: string;
  trackKey?: string;
  sortOrder?: number;
  published?: boolean;
  /** "Coming soon" — visible in listings but locked with no content access. */
  comingSoon?: boolean;
  lessons?: CreateLessonDto[];
}

export type UpdateCourseDto = Partial<CreateCourseDto>;

export interface CreateLessonDto {
  slug: string;
  title: string;
  content: string;
  contentEn?: string;
  durationMin?: number;
  sortOrder?: number;
  /** "Coming soon" — visible in listings but locked with no content access. */
  comingSoon?: boolean;
}

export interface CreateChallengeDto {
  slug: string;
  title: string;
  description: string;
  points?: number;
  startsAt: string;
  endsAt: string;
  active?: boolean;
  starterCode?: string;
}

export type UpdateChallengeDto = Partial<CreateChallengeDto>;

export type UpdateLessonDto = Partial<CreateLessonDto>;

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

/* --- Support tickets (Admin → Tickets) ------------------------------------ */

export type AdminTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type AdminTicketPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface AdminTicketReply {
  id: string;
  body: string;
  isStaff: boolean;
  authorName: string;
  createdAt: string;
}

export interface AdminTicketSummary {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  courseId: string | null;
  courseTitle: string | null;
  subject: string;
  body: string;
  category: string | null;
  status: AdminTicketStatus;
  priority: AdminTicketPriority;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTicketDetail extends AdminTicketSummary {
  replies: AdminTicketReply[];
}

export interface AdminTicketReplyDto {
  body: string;
}

export interface AdminTicketUpdateDto {
  status?: AdminTicketStatus;
  priority?: AdminTicketPriority;
}

/* --- Learner inbox messages (Admin → Messages) ----------------------------- */

export interface AdminLearnerMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  subject: string;
  body: string;
  readAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface AdminSendMessageDto {
  userId: string;
  subject: string;
  body: string;
}

/* --- Competitions (Admin → Competitions) ----------------------------------- */

export interface AdminCompetition {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  registrationCount: number;
  createdAt: string;
}

export interface AdminCompetitionRegistration {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  createdAt: string;
}

export interface AdminCreateCompetitionDto {
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  active?: boolean;
}

export type AdminUpdateCompetitionDto = Partial<AdminCreateCompetitionDto>;

/* --- Finance extensions (Admin → Finance) ----------------------------------- */

export interface AdminOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  status: string;
  totalCents: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}

export interface AdminEntitlement {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  resourceType: string;
  resourceId: string;
  source: string;
  createdAt: string;
}

export interface AdminGrantEntitlementDto {
  userId: string;
  resourceType: string;
  resourceId: string;
  source?: string;
}

export interface AdminWalletSummary {
  userId: string;
  userName: string;
  userEmail: string | null;
  balanceCents: number;
  currency: string;
  transactionCount: number;
  lastTransactionAt: string | null;
}

export interface AdminWalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amountCents: number;
  description: string;
  createdAt: string;
}

export interface AdminWalletDetail extends AdminWalletSummary {
  transactions: AdminWalletTransaction[];
}

export interface AdminAdjustWalletDto {
  type: 'CREDIT' | 'DEBIT';
  amountCents: number;
  description: string;
}
