import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  public readonly db: NodePgDatabase;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const databaseUrl =
      this.configService.get<string>('DATABASE_URL');
      

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured!');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });

    this.db = drizzle(this.pool);
  }

  async onModuleInit(): Promise<void> {
    await this.pool.query('SELECT 1');
    console.log('PostgreSQL database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}