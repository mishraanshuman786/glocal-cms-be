
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

const nodeEnv = process.env.NODE_ENV ?? 'development';

const envFiles = {
  development: '.env.dev',
  test: '.env.test',
  production: '.env.prod',
} as const;

const envFile = envFiles[nodeEnv as keyof typeof envFiles];

if (!envFile) {
  throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
}

// Load a local environment file only when DATABASE_URL
// has not already been provided by the environment.
if (!process.env.DATABASE_URL) {
  const result = config({ path: envFile });

  if (result.error) {
    throw new Error(
      `Unable to load ${envFile}: ${result.error.message}`,
    );
  }
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(`DATABASE_URL is missing for NODE_ENV=${nodeEnv}`);
}

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
