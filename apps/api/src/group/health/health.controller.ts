import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@kia./platform';

/** Liveness only. Signup/payment readiness is GET /api/ready, not this route. */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        timestamp: new Date().toISOString(),
      });
    }
    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
