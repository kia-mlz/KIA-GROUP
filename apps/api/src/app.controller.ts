import { Controller, Get } from '@nestjs/common';
import { isProductionEnv } from '@kia./platform';

@Controller()
export class AppController {
  @Get()
  root() {
    if (isProductionEnv()) {
      return { name: 'Kia API', status: 'ok' };
    }
    return {
      name: 'Kia API',
      status: 'ok',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        settings: '/api/settings',
        courses: '/api/courses',
        auth: '/api/auth',
      },
    };
  }
}
