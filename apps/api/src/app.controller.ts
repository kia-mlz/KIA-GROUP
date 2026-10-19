import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'KIA. API',
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
