import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@kia./platform';
import { isProductionEnv } from '@kia./platform';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Set trust proxy when running behind a reverse proxy (e.g. nginx, Railway, Fly.io)
  // so secure cookies and client IP detection work correctly.
  if (process.env.TRUST_PROXY === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  const uploadsRoot = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.use('/api/uploads/lessons', (_req: Request, res: Response) => {
    res.status(401).json({ message: 'Use authenticated media URLs for lesson videos' });
  });
  // Ticket attachments are private — download only via authenticated ticket routes.
  app.use('/api/uploads/tickets', (_req: Request, res: Response) => {
    res.status(401).json({ message: 'Use authenticated ticket attachment URLs' });
  });
  app.useStaticAssets(uploadsRoot, { prefix: '/api/uploads/' });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      // Keep Helmet CSP enabled (default policy) for defense in depth.
      hsts: isProductionEnv()
        ? { maxAge: 31536000, includeSubDomains: true, preload: false }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use(cookieParser());

  // Bound JSON/urlencoded bodies (multipart limits are enforced by multer).
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Support comma-separated origins (e.g. "https://a.com,https://b.com") so
  // deployments with multiple public hosts can restrict CORS precisely.
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (isProductionEnv() && corsOrigins.some((o) => /localhost|127\.0\.0\.1/i.test(o))) {
    throw new Error(
      '[security] CORS_ORIGIN still points at localhost in production — set it to your public web origin.',
    );
  }

  app.enableCors({
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
    credentials: true,
  });

  // `PORT=0` (or any non-positive value) means "no usable port set" — fall back to 3001
  // instead of letting listen() bind an ephemeral port silently.
  const configuredPort = Number(process.env.PORT);
  const port = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 3001;
  await app.listen(port);

  // Ensure SIGTERM/SIGINT close in-flight requests and DB connections cleanly.
  app.enableShutdownHooks();

  new Logger('Bootstrap').log(`Kia API running on http://localhost:${port}/api`);
}

bootstrap();
