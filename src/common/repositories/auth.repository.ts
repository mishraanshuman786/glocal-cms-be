import { Injectable } from '@nestjs/common';
import { eq, and, isNull,or, lt, isNotNull } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { roles, sessions, users } from '../../database/schema';
import { session } from 'passport';

interface CreateSessionData {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  async findUserByEmail(email: string) {
    const [user] = await this.databaseService.db
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

    return user ?? null;
  }

  async createSession(data: CreateSessionData) {
    const [session] = await this.databaseService.db
      .insert(sessions)
      .values(data)
      .returning();

    return session;
  }

  async findSessionById(sessionId:string){
    const [session]=await this.databaseService.db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);

    return session ?? null;
  }

  async revokeSession(sessionId:string):Promise<boolean>{
    const [session]=await this.databaseService.db.update(sessions).set({revokedAt:new Date()}).where(and(
        eq(sessions.id,sessionId),
        isNull(sessions.revokedAt)
    )).returning({id: sessions.id});

    return Boolean(session);
  }

  async deleteExpiredAndRevokedSessions(): Promise<number> {
  const deleted = await this.databaseService.db
    .delete(sessions)
    .where(
      or(
        lt(sessions.expiresAt, new Date()),
        isNotNull(sessions.revokedAt),
      ),
    )
    .returning({ id: sessions.id });

  return deleted.length;
}

}