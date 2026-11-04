
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Patch,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto } from '../common/dto/auth.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email: string;
    roleId: string;
    roleName: string;
  };
};

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const MAX_REFRESH_TOKEN_LENGTH = 4096;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: REFRESH_COOKIE_PATH,
    };
  }

  private getRefreshToken(request: Request): string | undefined {
    const token: unknown = request.cookies?.[REFRESH_COOKIE_NAME];

    // No cookie is allowed here. The service decides whether it is
    // acceptable for the particular operation.
    if (token === undefined) {
      return undefined;
    }

    if (
      typeof token !== 'string' ||
      token.length === 0 ||
      token.length > MAX_REFRESH_TOKEN_LENGTH
    ) {
      throw new BadRequestException('Invalid refresh token cookie');
    }

    return token;
  }

  private setRefreshCookie(
    response: Response,
    token: string,
    maxAge: number,
  ) {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.getCookieOptions(),
      maxAge,
    });
  }

  private clearRefreshCookie(response: Response) {
    response.clearCookie(
      REFRESH_COOKIE_NAME,
      this.getCookieOptions(),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const existingRefreshToken = this.getRefreshToken(request);

    const result = await this.authService.login(
      dto,
      existingRefreshToken,
    );

    if (result.refreshToken && result.refreshTokenMaxAge) {
      this.setRefreshCookie(
        response,
        result.refreshToken,
        result.refreshTokenMaxAge,
      );
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
    const refreshToken = this.getRefreshToken(request);

    const result = await this.authService.logout(refreshToken);

    this.clearRefreshCookie(response);

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.getRefreshToken(request);

    try {
      const result = await this.authService.refresh(refreshToken);

      this.setRefreshCookie(
        response,
        result.refreshToken,
        result.refreshTokenMaxAge,
      );

      return {
        success: true,
        message: 'Token refreshed successfully',
        accessToken: result.accessToken,
        user: result.user,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.clearRefreshCookie(response);
      }

      throw error;
    }
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() request: AuthenticatedRequest, @Body() dto:ChangePasswordDto, @Res({passthrough:true}) response:Response){
     const result=await this.authService.changePassword(request.user.id, dto);

    //  clear the current browser's refresh-token cookie
    this.clearRefreshCookie(response);

    return result;
  }
}
