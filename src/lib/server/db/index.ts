import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";

config({ path: ".env" });

export const db = drizzle({
	connection: {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		url: process.env.DATABASE_CONNECTION_URL!,
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		authToken: process.env.DATABASE_AUTH_TOKEN!,
	},
});
