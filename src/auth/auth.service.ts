import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { AuthRepository } from '../common/repositories/auth.repository';

import { LoginDto, ChangePasswordDto } from '../common/dto/auth.dto';

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

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

  const accessSecret = this.configService.get<string>(
    'JWT_ACCESS_SECRET',
  );

  const refreshSecret = this.configService.get<string>(
    'JWT_REFRESH_SECRET',
  );

  if (!accessSecret || !refreshSecret) {
    throw new InternalServerErrorException(
      'JWT secrets are not configured',
    );
  }

  const accessExpiresIn = this.configService.get<string>(
    'JWT_ACCESS_EXPIRES_IN',
    '15m',
  );

  const refreshExpiresIn = this.configService.get<string>(
    'JWT_REFRESH_EXPIRES_IN',
    '7d',
  );

  // Generate access token.
  const accessToken = await this.jwtService.signAsync(
    {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.roleName,
      type: 'access',
    },
    {
      secret: accessSecret,
      expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    },
  );

  // --------------------------------------------------
  // STEP 1: Check whether the browser already has a
  // valid refresh token belonging to this user.
  // --------------------------------------------------

  if (existingRefreshToken) {
    let payload: RefreshTokenPayload | null = null;

    try {
      const verifiedPayload =
        await this.jwtService.verifyAsync<RefreshTokenPayload>(
          existingRefreshToken,
          { secret: refreshSecret },
        );

      if (
        typeof verifiedPayload.sub === 'string' &&
        typeof verifiedPayload.sid === 'string' &&
        verifiedPayload.type === 'refresh'
      ) {
        payload = verifiedPayload;
      }
    } catch {
      // Invalid or expired refresh token.
      // Continue and create a new session.
    }

    // Database operations stay outside the JWT catch block.
    if (payload && payload.sub === user.id) {
      const session = await this.authRepository.findSessionById(
        payload.sid,
      );

      const tokenHash = this.hashToken(existingRefreshToken);
      const now = Date.now();

      const isValidSession =
        session &&
        session.userId === user.id &&
        !session.revokedAt &&
        session.expiresAt.getTime() > now &&
        session.absoluteExpiresAt.getTime() > now &&
        session.refreshTokenHash === tokenHash;

      if (isValidSession) {
        // Existing session is valid.
        // Do not create another session.
        return {
          accessToken,
          refreshToken: undefined,
          refreshTokenMaxAge: undefined,
          user: this.getSafeUser(user),
        };
      }
    }
  }

  // --------------------------------------------------
  // STEP 2: No valid existing session.
  // Create a new session and revoke the old sessions.
  // --------------------------------------------------

  const sessionId = randomUUID();
  const now = Date.now();

  const absoluteExpiresIn = this.configService.get<string>(
    'JWT_SESSION_ABSOLUTE_EXPIRES_IN',
    '30d',
  );

  const absoluteExpiresAt = new Date(
    now + this.parseDurationMs(absoluteExpiresIn),
  );

  const refreshExpiresAt = new Date(
    now + this.parseDurationMs(refreshExpiresIn),
  );

  // Refresh expiry cannot exceed absolute session expiry.
  const expiresAt = new Date(
    Math.min(
      refreshExpiresAt.getTime(),
      absoluteExpiresAt.getTime(),
    ),
  );

  const remainingSeconds = Math.floor(
    (expiresAt.getTime() - now) / 1000,
  );

  if (remainingSeconds <= 0) {
    throw new InternalServerErrorException(
      'Refresh token expiry must be in the future',
    );
  }

  const refreshToken = await this.jwtService.signAsync(
    {
      sub: user.id,
      sid: sessionId,
      type: 'refresh',
    },
    {
      secret: refreshSecret,
      expiresIn: `${remainingSeconds}s`,
    },
  );

  const refreshTokenHash = this.hashToken(refreshToken);

  // This transaction revokes previous active sessions
  // and inserts the new session.
  await this.authRepository.createSessionReplacingOthers({
    id: sessionId,
    userId: user.id,
    refreshTokenHash,
    expiresAt,
    absoluteExpiresAt,
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenMaxAge: remainingSeconds * 1000,
    user: this.getSafeUser(user),
  };
}

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!refreshSecret) {
      throw new InternalServerErrorException(
        'JWT refresh secret is not configured',
      );
    }

    let payload: RefreshTokenPayload;

    // Catch only JWT verification failures.
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: refreshSecret },
      );
    } catch {
      // Invalid or expired token.
      // Logout remains idempotent.
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }

    // Validate the JWT payload.
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      payload.type !== 'refresh'
    ) {
      return {
        success: true,
        message: 'Logged out successfully',
      };
    }

    // Database operations are deliberately outside the JWT catch block.
    const session = await this.authRepository.findSessionById(payload.sid);

    if (
      session &&
      session.userId === payload.sub &&
      !session.revokedAt &&
      session.refreshTokenHash === this.hashToken(refreshToken)
    ) {
      await this.authRepository.revokeSession(session.id);
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new InternalServerErrorException('JWT Secrets are not Configured!');
    }

    //  verify the refrest jwt
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      payload.type !== 'refresh'
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // check the user and role
    const user = await this.authRepository.findUserById(payload.sub);

    if (!user || !user.isActive || !user.roleIsActive) {
      throw new UnauthorizedException(
        'User account is inactive or unavailable!',
      );
    }

    // calculate the Hast of the presented token
    const oldRefreshTokenHash = this.hashToken(refreshToken);

    // calculate the new session expiry
    const session = await this.authRepository.findSessionById(payload.sid);

    const now = Date.now();

    if (
      !session ||
      session.userId !== user.id ||
      session.revokedAt ||
      session.refreshTokenHash !== oldRefreshTokenHash ||
      session.expiresAt.getTime() <= now ||
      session.absoluteExpiresAt.getTime() <= now
    ) {
      throw new UnauthorizedException('Refresh session is invalid or expired!');
    }

    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    // Never extend the session beyond its absolute expiry.
    const rollingExpiresAt = now + this.parseDurationMs(refreshExpiresIn);

    const expiresAt = new Date(
      Math.min(rollingExpiresAt, session.absoluteExpiresAt.getTime()),
    );

    const remainingSeconds = Math.floor((expiresAt.getTime() - now) / 1000);

    if (remainingSeconds <= 0) {
      throw new UnauthorizedException('Refresh session has expired');
    }

    // generate the replacement refresh token
    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        sid: session.id,
        type: 'refresh',
      },
      {
        secret: refreshSecret,
        expiresIn: `${remainingSeconds}s`,
      },
    );

    const newRefreshTokenHash = this.hashToken(newRefreshToken);

    // Issue a new access token
    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: user.roleName,
        type: 'access',
      },
      {
        secret: accessSecret,
        expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    // Atomically update the old token hash
    const updatedSession = await this.authRepository.rotateSession({
      sessionId: session.id,
      oldRefreshTokenHash,
      newRefreshTokenHash,
      expiresAt,
    });

    if (!updatedSession) {
      throw new UnauthorizedException(
        'Refresh token has already been used or revoked',
      );
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenMaxAge: remainingSeconds * 1000,
      user: this.getSafeUser(user),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    //  Load the authenticated user
    const user = await this.authRepository.findUserById(userId);

    if (!user || !user.isActive || !user.roleIsActive) {
      throw new UnauthorizedException('User account is unavailable');
    }

    //  Check bcrypt's maximum input size in bytes.
    if (
      Buffer.byteLength(dto.currentPassword, 'utf8') > 72 ||
      Buffer.byteLength(dto.newPassword, 'utf8') > 72
    ) {
      throw new BadRequestException('Password must not exceed 72 bytes');
    }

    // verify the existing password
    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is Incorrect!');
    }

    // Prevent setting the same password again
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New Password must be different from current password!',
      );
    }

    // Hash the new Password
    const saltRounds = 12;

    const newPasswordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    // Update password and revoke all sessions atomically
    await this.authRepository.updatePasswordAndRevokeSessions(
      userId,
      newPasswordHash,
    );

    return {
      success: true,
      message: 'Password Changed Successfully. Please log in again.',
    };
  }

  // private methods

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationMs(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);

    if (!match) {
      throw new InternalServerErrorException(
        `Invalid duration format: ${duration}`,
      );
    }

    const value = Number(match[1]);

    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new InternalServerErrorException(
        `Invalid duration value: ${duration}`,
      );
    }

    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  private getSafeUser(user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    roleName: string;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.roleName,
    };
  }
}
