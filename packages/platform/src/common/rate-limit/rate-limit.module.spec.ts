import { ConfigService } from '@nestjs/config';
import { RateLimitStorageProvider } from './rate-limit.module';

/**
 * CI-2 unit tests: storage selection + fail-open semantics.
 * Redis itself is exercised by the runtime smoke (28-probe suite boots the
 * built API); here we verify the wiring decisions that matter.
 */

function makeProvider(env: Record<string, string>): RateLimitStorageProvider {
  const config = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new RateLimitStorageProvider(config);
}

describe('RateLimitStorageProvider (CI-2)', () => {
  it('uses in-memory storage when REDIS_URL is absent and still counts', async () => {
    const provider = makeProvider({});
    try {
      const first = await provider.increment('k1', 60_000, 2, 60_000, 'default');
      expect(first.totalHits).toBe(1);
      expect(first.isBlocked).toBe(false);
    } finally {
      provider.onApplicationShutdown();
    }
  });

  it('blocks after the limit is exceeded (in-memory path)', async () => {
    const provider = makeProvider({});
    try {
      await provider.increment('k2', 60_000, 2, 60_000, 'default');
      await provider.increment('k2', 60_000, 2, 60_000, 'default');
      const third = await provider.increment('k2', 60_000, 2, 60_000, 'default');
      expect(third.totalHits).toBeGreaterThan(2);
      expect(third.isBlocked).toBe(true);
    } finally {
      // Clear the in-memory storage's TTL timers so Jest can exit cleanly.
      provider.onApplicationShutdown();
    }
  });

  it('fails open to in-memory counting when Redis rejects writes', async () => {
    const provider = makeProvider({ REDIS_URL: 'redis://127.0.0.1:1' });
    try {
      // Port 1 never accepts a write (offline queue is off, so the command is
      // rejected). increment must not throw — it degrades to in-memory storage.
      const record = await provider.increment('k3', 60_000, 100, 60_000, 'default');
      expect(record.totalHits).toBe(1);
    } finally {
      // Close Redis and the in-memory TTL timers. Both hooks must be safe
      // to call; either one releases every handle.
      provider.onModuleDestroy();
      provider.onApplicationShutdown();
    }
  });
});
