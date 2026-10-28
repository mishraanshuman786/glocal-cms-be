import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthRepository } from '../common/repositories/auth.repository';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(
    private readonly authRepository: AuthRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupSessions(): Promise<void> {
    try {
      const deleted =
        await this.authRepository.deleteExpiredAndRevokedSessions();

      this.logger.log(
        `Session cleanup completed. Deleted ${deleted} expired/revoked sessions.`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to clean up expired/revoked sessions.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}