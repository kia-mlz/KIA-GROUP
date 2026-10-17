import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '@kia./shared';
import {
  ADMIN_ACCESS_KEY,
  type AdminAccessRequirement,
} from '../decorators/admin-access.decorator';
import { ModeratorAccessService } from '../moderator-access.service';

@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moderatorAccess: ModeratorAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<AdminAccessRequirement>(
      ADMIN_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;

    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    const allowed = await this.moderatorAccess.assertAllowed(
      user,
      requirement.section,
      requirement.level,
    );
    if (!allowed) {
      throw new ForbiddenException('Admin access denied for this section');
    }

    return true;
  }
}
