# kia. — Database Architecture

One PostgreSQL database, one identity, six department domains. The schema lives
in [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) and
carries the domain-ownership map in its header comment.

## Ownership

| Domain | Models |
| --- | --- |
| **GROUP (platform)** | `User`, `Role`, `PhoneOtp`, `PasswordResetToken`, `TwoFactorRecoveryCode`, `RefreshToken`, `SiteSetting`, `ContactMessage`, `EmailLog`, `AdminAuditLog`, `Cart`+`CartItem`, `Order`+`OrderItem`, `Payment`, `PaymentWebhookEvent`, `Invoice`, `Entitlement`, `LearnerWallet`+`WalletTransaction`, `SupportTicket`+`TicketReply`+`TicketAttachment`, `LearnerMessage`, `LearnerTodo` |
| **ACADEMY** | `Assessment`, `Roadmap`, `ReadinessTest`, `PersonalityResult`, `ExamAttempt`, `Course`, `Lesson`, `CourseExam`+`CourseExamAttempt`, `CourseAttachment`, `Enrollment`, `LessonProgress`, `BootcampProfile` |
| **EVENTS** | `Challenge`, `ChallengeSubmission`, `Competition`, `CompetitionRegistration` |
| **WORK / MATERIAL / LABS / COMMUNITY** | No tables yet — these departments ship as routes + hub presence. Their future tables key users by the platform `User.id` and live in their own API domain folders. |

## Rules

1. **One identity.** Every department table references `User`, never another
   department's tables. This is what keeps the dependency rule (departments →
   platform) true at the storage layer.
2. **Cross-domain reads go through services or events**, not FKs. Example: the
   dashboard aggregates Academy progress and wallet balance through their
   owning services; nothing joins `LessonProgress` to `WalletTransaction`.
3. **Money lives on the platform.** Orders, payments, invoices, wallets and
   entitlements are GROUP-domain models because every department will eventually
   sell through them (`Entitlement.resourceType` already models course / roadmap
   / readiness as a vocabulary, not an FK).
4. **Migrations are append-only.** The baseline is `init_baseline`; hardening
   migrations (see `docs/AUDIT.md`) added enums, CHECK constraints and partial
   unique indexes. Never edit a shipped migration — add a new one.

## Entitlement vocabulary

`EntitlementResourceType` (`course` / `roadmap` / `readiness`) is deliberately a
Postgres enum, not a foreign key to department tables. That is what lets the
platform fulfil a payment without importing Academy models — the payment writes
an entitlement row, and the Academy reads its own resource type.

## Where the platform ends and a department begins

A new department table must:

- key users by `userId → User.id` (Cascade),
- live only in its department's API module (its service owns all reads/writes),
- not add FKs to other departments' tables,
- expose summaries through its department service, never through SQL joins
  into another domain's tables.
