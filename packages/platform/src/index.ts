// @kia./platform — kia. platform kernel (single entry point).
//
// apps/api (the shell) and every kia./* department package import
// shared infrastructure from here: Prisma, guards, decorators, domain
// events, site settings, media, email — plus the generated Prisma client.

export * from './common/decorators/admin-access.decorator';
export * from './common/decorators/audit-meta.decorator';
export * from './common/decorators/current-user.decorator';
export * from './common/decorators/roles.decorator';
export * from './common/events/domain-events.module';
export * from './common/events/domain-events';
export * from './common/events/event-bus.service';
export * from './common/filters/http-exception.filter';
export * from './common/guards/admin-access.guard';
export * from './common/guards/jwt-auth.guard';
export * from './common/guards/optional-jwt-auth.guard';
export * from './common/guards/profile-complete.guard';
export * from './common/guards/roles.guard';
export * from './common/moderator-access.service';
export * from './common/rate-limit/rate-limit.module';
export * from './common/utils/image-sniff';
export * from './common/utils/node-env';
export * from './common/utils/safe-path';
export * from './group/email/email.module';
export * from './group/email/email.service';
export * from './group/media/media-storage.service';
export * from './group/media/media.controller';
export * from './group/media/media.module';
export * from './group/media/media.service';
export * from './group/site-settings/dto/update-site-settings.dto';
export * from './group/site-settings/site-settings.controller';
export * from './group/site-settings/site-settings.module';
export * from './group/site-settings/site-settings.service';
export * from './generated/prisma/client';
export * from './prisma/prisma.module';
export * from './prisma/prisma.service';
