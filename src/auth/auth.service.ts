import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

import { AuthRepository } from '../common/repositories/auth.repository';
import { LoginDto } from '../common/dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

 async login(dto: LoginDto, existingRefreshToken?: string) {
  const email = dto.email.trim().toLowerCase();
  const user = await this.authRepository.findUserByEmail(email);

  if (!user || !user.isActive || !user.roleIsActive) {
    throw new UnauthorizedException('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(
    dto.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new UnauthorizedException('Invalid email or password');
  }

  const accessSecret =
    this.configService.get<string>('JWT_ACCESS_SECRET');
  const refreshSecret =
    this.configService.get<string>('JWT_REFRESH_SECRET');

  if (!accessSecret || !refreshSecret) {
    throw new InternalServerErrorException(
      'Authentication configuration is missing',
    );
  }

  const accessExpiresIn =
    this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
  const refreshExpiresIn =
    this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

  // Always generate a fresh access token after successful login.
  const accessToken = await this.jwtService.signAsync(
    {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.roleName,
    },
    {
      secret: accessSecret,
      expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    },
  );

  // Try to reuse the current browser's valid refresh-token session.
  if (existingRefreshToken) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        sid: string;
        type: string;
      }>(existingRefreshToken, { secret: refreshSecret });

      if (payload.sub === user.id && payload.sid && payload.type === 'refresh') {
        const session = await this.authRepository.findSessionById(payload.sid);

        const tokenHash = createHash('sha256')
          .update(existingRefreshToken)
          .digest('hex');

        const sessionIsValid =
          session &&
          session.userId === user.id &&
          !session.revokedAt &&
          session.expiresAt.getTime() > Date.now() &&
          session.refreshTokenHash === tokenHash;

        if (sessionIsValid) {
          // Keep the existing refresh token and database session.
          return {
            accessToken,
            refreshToken: undefined,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.roleName,
            },
          };
        }
      }
    } catch {
      // Expired or invalid cookie: continue by creating a new session.
    }
  }

  // No reusable session exists: create a new refresh token and session.
  const sessionId = randomUUID();

  const refreshToken = await this.jwtService.signAsync(
    {
      sub: user.id,
      sid: sessionId,
      type: 'refresh',
    },
    {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    },
  );

  const refreshTokenHash = createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  await this.authRepository.createSession({
    id: sessionId,
    userId: user.id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + this.parseDurationMs(refreshExpiresIn)),
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleName,
    },
  };
}

  async logout(refreshToken?: string) {
  if (!refreshToken) {
    return { success: true, message: 'Logged out successfully' };
  }

  const refreshSecret =
    this.configService.get<string>('JWT_REFRESH_SECRET');

  if (!refreshSecret) {
    throw new InternalServerErrorException(
      'Refresh token configuration is missing',
    );
  }

  let payload: { sub: string; sid: string; type: string };

  try {
    payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: refreshSecret,
    });
  } catch {
    // An invalid or expired cookie cannot establish a valid session.
    return { success: true, message: 'Logged out successfully' };
  }

  if (!payload.sid || payload.type !== 'refresh') {
    return { success: true, message: 'Logged out successfully' };
  }

  const session = await this.authRepository.findSessionById(payload.sid);

  if (
    session &&
    session.userId === payload.sub &&
    !session.revokedAt
  ) {
    const tokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Only revoke the session if the cookie matches its stored token hash.
    if (tokenHash === session.refreshTokenHash) {
      await this.authRepository.revokeSession(session.id);
    }
  }

  return { success: true, message: 'Logged out successfully' };
}

  private parseDurationMs(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
      throw new InternalServerErrorException(
        'Invalid token expiration configuration',
      );
    }

    const value = Number(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}