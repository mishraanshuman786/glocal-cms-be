
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';

const nodeEnv = process.env.NODE_ENV ?? 'development';

const envFilePath = {
  development: '.env.dev',
  test: '.env.test',
  production: '.env.prod',
} as const;

const selectedEnvFile =
  envFilePath[nodeEnv as keyof typeof envFilePath];

if (!selectedEnvFile) {
  throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: selectedEnvFile,
    }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
