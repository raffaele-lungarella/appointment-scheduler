import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

export default defineConfig({
	schema: "./src/lib/server/db/schema.ts",
	out: "./migrations",
	dialect: "turso",
	dbCredentials: {
		url: process.env.DATABASE_CONNECTION_URL!,
		authToken: process.env.DATABASE_AUTH_TOKEN!,
	},
});
