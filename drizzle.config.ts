import {config} from "dotenv";
import {defineConfig} from "drizzle-kit";
import { env } from "process";

const nodeEnv= process.env.NODE_ENV ?? 'development';

const envFiles={
    development:".env.dev",
    test:"env.test",
    production:".env.prod"
};

const envFile=envFiles[nodeEnv as keyof typeof envFiles];

if(!envFile){
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
}

config({path:envFile});

const databaseUrl=process.env.DATABASE_URL;

if(!databaseUrl){
    throw new Error(`DATABASE_URL is missing in ${envFile}`);
}

export default defineConfig({
schema:"./src/database/schema/index.ts",
out:"./src/database/migrations",
dialect:"postgresql",
dbCredentials:{
    url:databaseUrl
}
});