import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from '../common/dto/login.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
    roleId: string;
    roleName: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const existingRefreshToken = request.cookies?.refresh_token as
      string | undefined;

    const result = await this.authService.login(dto, existingRefreshToken);

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    // Set a cookie only when the service creates a new refresh token.
    if (result.refreshToken) {
      const refreshExpiresIn =
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

      response.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: this.parseDurationMs(refreshExpiresIn),
      });
    }

    return {
      success: true,
      message: 'Login successful',
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: AuthenticatedRequest) {
    return {
      success: true,
      user: request.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refresh_token as string | undefined;

    const result = await this.authService.logout(refreshToken);

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return result;
  }

  private parseDurationMs(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
      throw new Error('Invalid JWT_REFRESH_EXPIRES_IN configuration');
    }

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return Number(match[1]) * multipliers[match[2]];
  }
}
