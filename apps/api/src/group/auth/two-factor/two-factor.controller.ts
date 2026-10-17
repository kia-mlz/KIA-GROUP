import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, AuthUser } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { AuthService } from '../auth.service';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorCodeDto, TwoFactorChallengeDto } from './dto/two-factor.dto';

/**
 * Self-service TOTP endpoints + the second login step.
 *
 * Staff-only enrollment is enforced inside TwoFactorService (learners are
 * rejected); `POST /auth/2fa/verify` is the brute-force gate for the second
 * login factor and is therefore throttled hard.
 *
 * Admin overrides (list/disable other accounts) live in the admin module with
 * audit logging, mirroring the other sensitive user-management actions.
 */
@Controller()
export class TwoFactorController {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly authService: AuthService,
  ) {}

  @Post('auth/2fa/setup')
  @UseGuards(JwtAuthGuard)
  setup(@CurrentUser() user: AuthUser) {
    return this.twoFactorService.setup(user);
  }

  @Post('auth/2fa/confirm')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  confirm(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactorService.confirm(user, dto.code);
  }

  @Get('auth/2fa/status')
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: AuthUser) {
    return this.twoFactorService.status(user);
  }

  @Post('auth/2fa/recovery-codes')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  regenerateRecoveryCodes(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactorService.regenerateRecoveryCodes(user, dto.code);
  }

  @Delete('auth/2fa')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  disable(@CurrentUser() user: AuthUser, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactorService.disable(user, dto.code);
  }

  /**
   * Second login step for 2FA-enabled staff accounts: exchanges the
   * single-purpose challenge from `POST /auth/login` plus a TOTP or recovery
   * code for a real session.
   */
  @Post('auth/2fa/verify')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  verify(@Body() dto: TwoFactorChallengeDto): Promise<AuthResponse> {
    return this.authService.completeTwoFactorLogin(dto.challenge, dto.code);
  }
}
