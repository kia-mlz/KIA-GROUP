import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { RateLimitModule } from '@kia./platform';
import { DomainEventsModule } from '@kia./platform';
import { AppController } from './app.controller';
import { PrismaModule } from '@kia./platform';

/*
 * kia. domain registry.
 *
 * The API is a modular monolith: every Nest module belongs to exactly one
 * department domain, and the folder layout mirrors that ownership:
 *
 *   src/ + @kia./platform — the platform shell (identity, sessions,
 *                   admin, settings via packages/platform, SMS, support,
 *                   billing/commerce, health) — packages/platform also holds
 *                   the Prisma kernel + shared guards/decorators/events
 *   @kia./kia-academy — Kia Academy learning domain  (kia./kia-academy)
 *   @kia./kia-event   — competitions, challenges & bootcamps
 *                            (kia./kia-event)
 *
 * Departments never import each other's services: cross-department reads go
 * through the shared package contracts or the domain-events bus.
 */
import { AuthModule } from './group/auth/auth.module';
import { AdminModule } from './group/admin/admin.module';
import { SiteSettingsModule } from '@kia./platform';
import { MediaModule } from '@kia./platform';
import { EmailModule } from '@kia./platform';
import { SmsModule } from './group/sms/sms.module';
import { ContactModule } from './group/contact/contact.module';
import { HealthModule } from './group/health/health.module';
import { TicketsModule } from './group/support/tickets/tickets.module';
import { MessagesModule } from './group/support/messages/messages.module';
import { TodosModule } from './group/support/todos/todos.module';
import { CartModule } from './group/commerce/cart/cart.module';
import { PaymentsModule } from './group/commerce/payments/payments.module';
import { StripeModule } from './group/commerce/stripe/stripe.module';
import { SearchModule } from './group/search/search.module';
import { CoursesModule } from '@kia./kia-academy';
import { CourseExamsModule } from '@kia./kia-academy';
import { AssessmentsModule } from '@kia./kia-academy';
import { PersonalityModule } from '@kia./kia-academy';
import { RoadmapsModule } from '@kia./kia-academy';
import { ReadinessModule } from '@kia./kia-academy';
import { BootcampModule } from '@kia./kia-event';
import { TestBanksModule } from '@kia./kia-academy';
import { ProgressModule } from '@kia./kia-academy';
import { CompetitionsModule } from '@kia./kia-event';
import { ChallengesModule } from '@kia./kia-event';

@Module({
  controllers: [AppController],
  imports: [
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [
    '../../.env',
    '.env',
  ],
  validationSchema: envValidationSchema,
}),    // CI-2: throttling storage is selected by RateLimitModule (imported below,
    // global) — the Redis-backed provider when REDIS_URL is configured, the
    // stock in-memory service otherwise. It re-registers ThrottlerStorage at a
    // later position in the DI graph, which wins over ThrottlerModule's default.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    RateLimitModule,
    PrismaModule,
    // Platform-wide domain event bus (see src/common/events).
    DomainEventsModule,
    // ── kia. platform (identity, settings, support, billing) ──────────
    AuthModule,
    AdminModule,
    SiteSettingsModule,
    MediaModule,
    EmailModule,
    SmsModule,
    ContactModule,
    HealthModule,
    TicketsModule,
    MessagesModule,
    TodosModule,
    CartModule,
    PaymentsModule,
    StripeModule,
    SearchModule,
    // ── Kia Academy (learning domain) ──────────────────────────────────────
    CoursesModule,
    CourseExamsModule,
    AssessmentsModule,
    PersonalityModule,
    RoadmapsModule,
    ReadinessModule,
    BootcampModule,
    TestBanksModule,
    ProgressModule,
    // ── KIA Event (competitions & challenges) ────────────────────────────
    CompetitionsModule,
    ChallengesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
