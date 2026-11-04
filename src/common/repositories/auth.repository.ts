import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull, isNull, lt, gt, or } from 'drizzle-orm';
import { NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { users, roles, sessions } from '../../database/schema';

interface CreateSessionData {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  absoluteExpiresAt: Date;
}

interface RotateSessionData {
  sessionId: string;
  oldRefreshTokenHash: string;
  newRefreshTokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findUserByEmail(email: string) {
    const [result] = await this.database.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
        roleId: roles.id,
        roleName: roles.name,
        roleIsActive: roles.isActive,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email))
      .limit(1);

    return result;
  }

  async findUserById(userId: string) {
    const [user] = await this.database.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
        roleId: roles.id,
        roleName: roles.name,
        roleIsActive: roles.isActive,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, userId))
      .limit(1);

    return user;
  }

  async createSession(data: CreateSessionData) {
    const [session] = await this.database.db
      .insert(sessions)
      .values(data)
      .returning();

    return session;
  }

  async findSessionById(sessionId: string) {
    const [session] = await this.database.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    return session;
  }

  async rotateSession(data: RotateSessionData) {
    const now = new Date();

    const [updatedSession] = await this.database.db
      .update(sessions)
      .set({
        refreshTokenHash: data.newRefreshTokenHash,
        expiresAt: data.expiresAt,
      })
      .where(
        and(
          eq(sessions.id, data.sessionId),
          eq(sessions.refreshTokenHash, data.oldRefreshTokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
          gt(sessions.absoluteExpiresAt, now),
        ),
      )
      .returning();

    return updatedSession;
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const [revoked] = await this.database.db
      .update(sessions)
      .set({
        revokedAt: new Date(),
      })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
      .returning({
        id: sessions.id,
      });

    return Boolean(revoked);
  }

  async deleteExpiredAndRevokedSessions(): Promise<number> {
    const now = new Date();

    const deleted = await this.database.db
      .delete(sessions)
      .where(
        or(
          lt(sessions.expiresAt, now),
          lt(sessions.absoluteExpiresAt, now),
          isNotNull(sessions.revokedAt),
        ),
      )
      .returning({
        id: sessions.id,
      });

    return deleted.length;
  }

  async updatePasswordAndRevokeSessions(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
        });

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      await tx
        .update(sessions)
        .set({
          revokedAt: new Date(),
        })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    });
  }

  async createSessionReplacingOthers(data: CreateSessionData) {
  return this.database.db.transaction(async (tx) => {
    const now = new Date();

    // Lock the user row so simultaneous login requests
    // cannot create multiple active sessions.
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, data.userId))
      .for('update');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Revoke all existing active sessions for this user.
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, data.userId),
          isNull(sessions.revokedAt),
        ),
      );

    // Create the new session.
    const [newSession] = await tx
      .insert(sessions)
      .values(data)
      .returning();

    return newSession;
  });
}
}
