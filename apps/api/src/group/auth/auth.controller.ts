import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import type {
  AuthResponse,
  AuthUser,
  LearnerState,
  ProfileDetails,
  RequestOtpResponse,
  TwoFactorChallengeResponse,
} from '@kia./shared';
import type { Request, Response } from 'express';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

import { CompleteProfileDto, RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { ConfigService } from '@nestjs/config';
import { parseExpiresInSeconds } from './auth.utils';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse | TwoFactorChallengeResponse> {
    const result = await this.authService.login(dto);
    if ('twoFactorRequired' in result) {
      // No session exists yet — the client must complete POST /auth/2fa/verify.
      return result;
    }
    this.setRefreshCookie(res, result.refreshToken);
    return this.stripRefreshToken(result);
  }

  @Post('otp/request')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestOtp(@Body() dto: RequestOtpDto): Promise<RequestOtpResponse> {
    return this.authService.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.verifyOtp(dto.phone, dto.code);
    this.setRefreshCookie(res, result.refreshToken);
    return this.stripRefreshToken(result);
  }

  /**
   * Always returns success (uniform response): unknown emails and rate-capped
   * requests are indistinguishable from successful dispatch.
   */
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ success: true }> {
    await this.authService.forgotPassword(dto);
    return { success: true };
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: true }> {
    await this.authService.resetPassword(dto);
    return { success: true };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    // The current session survives the rotation; other devices are signed out.
    await this.authService.changePassword(
      user.id,
      dto,
      req.cookies?.refreshToken as string | undefined,
    );
    return { success: true };
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  async completeProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteProfileDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.completeProfile(user.id, dto);
    this.setRefreshCookie(res, result.refreshToken);
    return this.stripRefreshToken(result);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthUser): Promise<ProfileDetails> {
    return this.authService.getProfileDetails(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteProfileDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.updateProfile(user.id, dto);
    this.setRefreshCookie(res, result.refreshToken);
    return this.stripRefreshToken(result);
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProfileDetails> {
    return this.authService.updateAvatar(user.id, file);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(
    @CurrentUser() user: AuthUser & { refreshToken?: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    if (!user.refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.authService.refresh(user, user.refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    return this.stripRefreshToken(result);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    await this.authService.logout(user.id, refreshToken);
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUser): Promise<LearnerState> {
    return this.authService.getLearnerState(user.id);
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const maxAge = parseExpiresInSeconds(refreshExpiresIn) * 1000;
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    const crossSite = /github\.io/i.test(corsOrigin) || process.env.COOKIE_SAMESITE === 'none';

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction || crossSite,
      sameSite: crossSite ? 'none' : isProduction ? 'strict' : 'lax',
      maxAge,
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie('refreshToken', { path: '/' });
  }

  private stripRefreshToken(result: AuthResponse & { refreshToken: string }): AuthResponse {
    const { refreshToken: _refreshToken, ...response } = result;
    return response;
  }
}
