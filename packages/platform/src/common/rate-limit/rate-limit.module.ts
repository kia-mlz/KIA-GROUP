import {
  Global,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import Redis, { type RedisOptions } from 'ioredis';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigService } from '@nestjs/config';

/**
 * CI-2 — distributed rate limiting.
 *
 * The @nestjs/throttler default storage is a per-process `Map`, which is fine
 * for a single instance but lets attackers multiply their budget across
 * replicas. When `REDIS_URL` is configured, this module registers the
 * Redis-backed storage so every API replica shares one counter store; when it
 * is absent (local dev, CI, single-node deployments), the stock in-memory
 * service is used instead.
 *
 * Availability policy: Redis outages must NOT take the API down. The wrapper
 * fails open — on a Redis error it falls back to the in-memory service for
 * that request and logs the failure (monitor logs; they indicate Redis
 * connectivity problems). Fail-open is the deliberate trade-off: rate limits
 * are abuse mitigation, not a correctness guarantee.
 */
@Injectable()
export class RateLimitStorageProvider implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(RateLimitStorageProvider.name);
  private readonly redis: ThrottlerStorageRedisService | null;
  private readonly memory = new ThrottlerStorageService();
  private released = false;

  constructor(configService: ConfigService) {
    const url = configService.get<string>('REDIS_URL');
    if (url) {
      try {
        const isTest = process.env.NODE_ENV === 'test';
        const redisOptions: RedisOptions = {
          // Attach the error listener before the socket opens. Connecting is
          // still kicked off below so boot does not wait on Redis.
          lazyConnect: true,
          maxRetriesPerRequest: isTest ? 1 : 2,
          connectTimeout: isTest ? 500 : 5_000,
          enableOfflineQueue: false,
        };
        // Jest must not inherit ioredis's infinite reconnect timer when the
        // test points at a closed port. Production keeps the default strategy.
        if (isTest) redisOptions.retryStrategy = () => null;

        const client = new Redis(url, redisOptions);
        client.on('error', (err: Error) => {
          this.logger.error(`Redis rate-limit store error: ${err.message}`);
        });
        this.redis = new ThrottlerStorageRedisService(client);
        this.logger.log('Distributed rate limiting enabled (Redis storage)');
        void client.connect().catch((err: unknown) => {
          this.logger.error(
            `Redis rate-limit connection failed; failing open to in-memory storage`,
            err instanceof Error ? err.message : undefined,
          );
        });
      } catch (err) {
        this.redis = null;
        this.logger.error(
          `Failed to initialize Redis rate-limit storage; using in-memory storage`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    } else {
      this.redis = null;
      this.logger.warn(
        'REDIS_URL not set — using in-memory rate limiting (single-instance only)',
      );
    }
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    if (this.redis) {
      try {
        return await this.redis.increment(key, ttl, limit, blockDuration, throttlerName);
      } catch (err) {
        this.logger.error(
          `Redis increment failed — failing open to in-memory storage`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
    return this.memory.increment(key, ttl, limit, blockDuration, throttlerName);
  }

  /**
   * Close the Redis socket and the in-memory TTL timers. Either Nest hook is
   * enough: tests and shutdown both need both resources released, or Jest
   * force-exits the worker (Redis reconnect + throttler setTimeout).
   */
  private release(): void {
    if (this.released) return;
    this.released = true;
    const client = this.redis?.redis;
    if (client) {
      client.removeAllListeners();
      try {
        client.disconnect();
      } catch {
        // Already closed after a refused connection.
      }
    }
    this.memory.onApplicationShutdown();
  }

  onModuleDestroy(): void {
    this.release();
  }

  onApplicationShutdown(): void {
    this.release();
  }
}

/**
 * Binds the wrapper to the token @nestjs/throttler's ThrottlerGuard injects
 * (`ThrottlerStorage`). The module is registered AFTER ThrottlerModule in
 * AppModule; Nest resolves a duplicated provider token from the module that is
 * imported last, so this registration overrides the stock in-memory provider.
 */
export const RATE_LIMIT_STORAGE_PROVIDER = {
  provide: ThrottlerStorage,
  useClass: RateLimitStorageProvider,
};

@Global()
@Module({
  providers: [RATE_LIMIT_STORAGE_PROVIDER],
  exports: [RATE_LIMIT_STORAGE_PROVIDER],
})
export class RateLimitModule {}
