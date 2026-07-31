import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

const url = process.env.DATABASE_CONNECTION_URL;

if (!url) {
  throw new Error("DATABASE_CONNECTION_URL is not set");
}

type DBCredentials =
  { isLocal: true; url: string } | { isLocal: false; url: string; authToken: string };

function getCredentials(url: string): DBCredentials {
  if (url.startsWith("file:")) {
    return { isLocal: true, url };
  }
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!authToken) {
    throw new Error("DATABASE_AUTH_TOKEN is not set for remote database");
  }
  return { isLocal: false, url, authToken };
}

const credentials = getCredentials(url);

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  out: "./migrations",
  dialect: credentials.isLocal ? "sqlite" : "turso",
  dbCredentials: credentials.isLocal
    ? { url: credentials.url }
    : { url: credentials.url, authToken: credentials.authToken },
});
