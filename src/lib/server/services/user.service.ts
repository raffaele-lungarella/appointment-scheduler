import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, count, eq, isNotNull, lt } from "drizzle-orm";
import { logger } from "../logger";
import { err, ok, type Result } from "$lib/modules/result";
import { hash } from "argon2";
import { encodeBase32LowerCase } from "@oslojs/encoding";
import { DAY_IN_MS } from "$lib/constants";
import { emailSchema, passwordSchema } from "$lib/modules/zod-schemas";
import type { DBUser, User } from "@types";
import { StaffService } from "@service/staff.service";
import { Service } from "./service";

type InsertError =
	| "already-existing"
	| "data-required"
	| "invalid-email"
	| "invalid-pass"
	| "generic";

export class UserService extends Service {
	async insert(data: {
		email: string;
		password: string;
		name: string;
		phoneNumber: string;
	}): Promise<Result<DBUser, InsertError>> {
		try {
			if (!data.email || !data.password) {
				return err("data-required");
			}

			const email = data.email.toLowerCase().trim();

			const isPresent = await this.getByEmail(email);
			if (isPresent) {
				return err("already-existing");
			}

			const validEmail = emailSchema.safeParse(email);

			if (!validEmail.success) {
				return err("invalid-email");
			}

			const validPassword = passwordSchema.safeParse(data.password);
			if (!validPassword.success) {
				return err("invalid-pass");
			}

			const passwordHash = await hash(data.password, {
				// recommended minimum parameters
				memoryCost: 19456,
				timeCost: 2,
				parallelism: 1,
			});

			const userID = this.generateUserId();

			return ok(
				await db
					.insert(table.user)
					.values({
						id: userID,
						email,
						passwordHash,
						name: data.name,
						phoneNumber: data.phoneNumber,
						verifiedEmail: false,
						expiresAt: new Date(Date.now() + DAY_IN_MS),
					})
					.returning()
					.get(),
			);
		} catch {
			return err("generic");
		}
	}

	async getByEmail(email: string): Promise<User | null> {
		try {
			const lowercaseEmail = email.toLowerCase().trim();
			const user = await db
				.select()
				.from(table.user)
				.where(eq(table.user.email, lowercaseEmail))
				.get();

			if (!user) {
				logger.warn("User not found");
				return null;
			}

			const staff = await StaffService.get().getByUserID(user.id);

			if (!staff) {
				return {
					role: "user",
					data: user,
				};
			} else {
				return {
					role: "staff",
					data: { ...user, ...staff },
				};
			}
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async getByID(id: string): Promise<User | null> {
		try {
			const result = await db
				.select()
				.from(table.user)
				.leftJoin(table.staff, eq(table.staff.userID, table.user.id))
				.where(eq(table.user.id, id))
				.get();

			if (!result) {
				logger.warn("User not found");
				return null;
			}

			if (!result.staff) {
				return {
					role: "user",
					data: result.user,
				};
			} else {
				return {
					role: "staff",
					data: { ...result.user, ...result.staff },
				};
			}
		} catch (err) {
			logger.error(err);
			return null;
		}
	}

	async verifyEmail(id: string) {
		try {
			return await db
				.update(table.user)
				.set({
					verifiedEmail: true,
					expiresAt: null,
				})
				.where(eq(table.user.id, id))
				.returning()
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async updatePassword(passwordHash: string, id: string) {
		try {
			return await db
				.update(table.user)
				.set({ passwordHash })
				.where(eq(table.user.id, id))
				.returning()
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async updateEmail(id: string, _email: string) {
		const email = _email.toLowerCase().trim();
		try {
			return await db
				.update(table.user)
				.set({
					email,
				})
				.where(eq(table.user.id, id))
				.returning()
				.get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async updatePhoneNumber(id: string, phoneNumber: string) {
		try {
			return await db
				.update(table.user)
				.set({ phoneNumber: phoneNumber.trim() })
				.where(eq(table.user.id, id));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async updateName(id: string, name: string) {
		try {
			return await db
				.update(table.user)
				.set({ name: name.trim() })
				.where(eq(table.user.id, id));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async updateInfo(id: string, name?: string, phoneNumber?: string) {
		try {
			const updateData: Record<string, string> = {};

			if (name?.trim()) {
				updateData.name = name;
			}

			if (phoneNumber?.trim()) {
				updateData.phoneNumber = phoneNumber;
			}

			if (Object.keys(updateData).length === 0) {
				// Nothing to update
				return;
			}
			return await db.update(table.user).set(updateData).where(eq(table.user.id, id));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async delete(id: string) {
		try {
			return await db.delete(table.user).where(eq(table.user.id, id)).returning().get();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async countExpired() {
		try {
			const entries = await db
				.select({ count: count() })
				.from(table.user)
				.where(
					and(eq(table.user.verifiedEmail, false), lt(table.user.expiresAt, new Date())),
				)
				.get();

			return entries?.count;
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async deleteAllExpired() {
		try {
			return await db
				.delete(table.user)
				.where(
					and(
						eq(table.user.verifiedEmail, false),
						isNotNull(table.user.expiresAt),
						lt(table.user.expiresAt, new Date()),
					),
				);
		} catch (err) {
			logger.error("Error while removing expired users");
			console.error(err);
		}
	}

	private generateUserId() {
		// ID with 120 bits of entropy, or about the same as UUID v4.
		const bytes = crypto.getRandomValues(new Uint8Array(15));
		const id = encodeBase32LowerCase(bytes);
		return id;
	}
}
