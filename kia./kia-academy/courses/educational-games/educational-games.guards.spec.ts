import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ADMIN_ACCESS_KEY } from '@kia./platform';
import { AdminEducationalGamesController } from './admin-educational-games.controller';
import { EducationalGamesController } from './educational-games.controller';
import { JwtAuthGuard } from '@kia./platform';

describe('educational game auth', () => {
  it('requires a session for learner routes', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, EducationalGamesController) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
  });

  it('gates admin routes with the educationalGames section', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AdminEducationalGamesController) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
    const requirement = Reflect.getMetadata(
      ADMIN_ACCESS_KEY,
      AdminEducationalGamesController.prototype.dashboard,
    ) as { section: string; level: string };
    expect(requirement).toEqual({ section: 'educationalGames', level: 'view' });
    const manage = Reflect.getMetadata(
      ADMIN_ACCESS_KEY,
      AdminEducationalGamesController.prototype.create,
    ) as { section: string; level: string };
    expect(manage.level).toBe('manage');
  });
});
