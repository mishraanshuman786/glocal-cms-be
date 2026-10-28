import dotenv from "dotenv";
import path from "node:path";

const environment=process.env.NODE_ENV ?? "development";

const envFiles:Record<string,string>={
    development:".env.dev",
    test:".env.test",
    production:".env.prod"
}

const envFile=envFiles[environment];

if (!envFile) {
  throw new Error(`Unsupported NODE_ENV: ${environment}`);
}

const envPath = path.resolve(process.cwd(), envFile);

// Existing deployment environment variables take precedence.
const result = dotenv.config({
  path: envPath,
  override: false,
});

if (result.error && environment !== "production") {
  throw new Error(`Could not load ${envFile}: ${result.error.message}`);
}

if (environment === "production" && result.error) {
  console.log("Production environment variables are supplied externally.");
}

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL is missing for ${environment}`);
}