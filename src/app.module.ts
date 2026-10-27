import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';

const nodeEnv=process.env.NODE_ENV || 'development';

const envFilePath={
  development:".env.dev",
  test:".env.test",
  production:".env.prod"
} as const;

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal:true,
    envFilePath:envFilePath[nodeEnv as keyof typeof envFilePath] ?? 'env.dev'
  }),
  DatabaseModule
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
