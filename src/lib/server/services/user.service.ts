import { DAY_IN_MS } from "$lib/constants";
import { err, ok, type Result } from "$lib/modules/result";
import { emailSchema, passwordSchema } from "$lib/modules/zod-schemas";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import type { UserRow } from "$lib/server/db/schema";
import type { User } from "$lib/server/domain";
import { toUserDomain } from "$lib/server/mappers/user.mapper";
import { encodeBase32LowerCase } from "@oslojs/encoding";
import { hash } from "argon2";
import { and, count, eq, isNotNull, isNull, lt, or } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";
import type { ServiceResult } from "./service-result";

type InsertError = "already-existing" | "invalid-email" | "invalid-pass" | "generic";

const logger = createLogger("UserService");

export class UserService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async insert(data: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
  }): Promise<Result<UserRow, InsertError>> {
    try {
      const email = data.email.toLowerCase().trim();

      const validEmail = emailSchema.safeParse(email);
      if (!validEmail.success) {
        return err("invalid-email");
      }

      const validPassword = passwordSchema.safeParse(data.password);
      if (!validPassword.success) {
        return err("invalid-pass");
      }

      const existingUser = await this.getByEmail(validEmail.data);
      if (existingUser.isOk()) {
        return err("already-existing");
      }
      if (existingUser.error.type === "storage-error") {
        return err("generic");
      }

      const passwordHash = await hash(data.password, {
        // recommended minimum parameters
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      const userID = this.generateUserId();

      return ok(
        await this.database
          .insert(table.user)
          .values({
            id: userID,
            email: validEmail.data,
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

  async getByEmail(
    email: string,
  ): Promise<ServiceResult<User, { type: "not-found" } | { type: "storage-error" }>> {
    try {
      const lowercaseEmail = email.toLowerCase().trim();
      const result = await this.database
        .select()
        .from(table.user)
        .leftJoin(table.staff, eq(table.staff.userID, table.user.id))
        .where(eq(table.user.email, lowercaseEmail))
        .get();

      if (!result) return err({ type: "not-found" });
      return ok(toUserDomain(result.user, result.staff));
    } catch (e) {
      logger.error({ err: e, email }, "getByEmail failed");
      return err({ type: "storage-error" });
    }
  }

  async getByID(
    id: string,
  ): Promise<ServiceResult<User, { type: "not-found" } | { type: "storage-error" }>> {
    try {
      const result = await this.database
        .select()
        .from(table.user)
        .leftJoin(table.staff, eq(table.staff.userID, table.user.id))
        .where(eq(table.user.id, id))
        .get();

      if (!result) {
        return err({ type: "not-found" });
      }

      return ok(toUserDomain(result.user, result.staff));
    } catch (error) {
      logger.error({ err: error, userId: id }, "getByID failed");
      return err({ type: "storage-error" });
    }
  }

  async verifyEmail(id: string) {
    try {
      return await this.database
        .update(table.user)
        .set({
          verifiedEmail: true,
          expiresAt: null,
        })
        .where(eq(table.user.id, id))
        .returning()
        .get();
    } catch (e) {
      logger.error({ err: e, userId: id }, "verifyEmail failed");
      return null;
    }
  }

  async updatePassword(passwordHash: string, id: string) {
    try {
      return await this.database
        .update(table.user)
        .set({ passwordHash })
        .where(eq(table.user.id, id))
        .returning()
        .get();
    } catch (e) {
      logger.error({ err: e, userId: id }, "updatePassword failed");
      return null;
    }
  }

  async updateEmail(id: string, _email: string): Promise<Result<UserRow, "server-err">> {
    const email = _email.toLowerCase().trim();
    try {
      const updated = await this.database
        .update(table.user)
        .set({ email })
        .where(eq(table.user.id, id))
        .returning()
        .get();
      if (!updated) return err("server-err");
      return ok(updated);
    } catch (e) {
      logger.error({ err: e, userId: id }, "updateEmail failed");
      return err("server-err");
    }
  }

  async updatePhoneNumber(id: string, phoneNumber: string) {
    try {
      return await this.database
        .update(table.user)
        .set({ phoneNumber: phoneNumber.trim() })
        .where(eq(table.user.id, id))
        .returning()
        .get();
    } catch (e) {
      logger.error({ err: e, userId: id }, "updatePhoneNumber failed");
      return null;
    }
  }

  async updateName(id: string, name: string) {
    try {
      return await this.database
        .update(table.user)
        .set({ name: name.trim() })
        .where(eq(table.user.id, id))
        .returning()
        .get();
    } catch (e) {
      logger.error({ err: e, userId: id }, "updateName failed");
      return null;
    }
  }

  async updateInfo(id: string, name: string, phoneNumber: string): Promise<boolean> {
    const normalizedName = name.trim();
    const normalizedPhoneNumber = phoneNumber.trim();
    if (!normalizedName) return false;

    try {
      const updated = await this.database
        .update(table.user)
        .set({ name: normalizedName, phoneNumber: normalizedPhoneNumber })
        .where(eq(table.user.id, id))
        .returning({ id: table.user.id });
      return updated.length === 1;
    } catch (e) {
      logger.error({ err: e, userId: id }, "updateInfo failed");
      return false;
    }
  }

  async delete(id: string) {
    try {
      return await this.database.delete(table.user).where(eq(table.user.id, id)).returning().get();
    } catch (e) {
      logger.error({ err: e, userId: id }, "delete failed");
      return null;
    }
  }

  async deleteAccount(id: string, email: string) {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      return await this.database.transaction(async (tx) => {
        await tx
          .delete(table.reservation)
          .where(
            or(
              eq(table.reservation.ownerUserID, id),
              eq(table.reservation.staffID, id),
              and(
                isNull(table.reservation.ownerUserID),
                eq(table.reservation.email, normalizedEmail),
              ),
            ),
          );

        return await tx.delete(table.user).where(eq(table.user.id, id)).returning().get();
      });
    } catch (e) {
      logger.error({ err: e, userId: id }, "deleteAccount failed");
      return null;
    }
  }

  async countExpired() {
    try {
      const entries = await this.database
        .select({ count: count() })
        .from(table.user)
        .where(and(eq(table.user.verifiedEmail, false), lt(table.user.expiresAt, new Date())))
        .get();

      return entries?.count;
    } catch (e) {
      logger.error({ err: e }, "countExpired failed");
      return null;
    }
  }

  async deleteAllExpired() {
    try {
      return await this.database
        .delete(table.user)
        .where(
          and(
            eq(table.user.verifiedEmail, false),
            isNotNull(table.user.expiresAt),
            lt(table.user.expiresAt, new Date()),
          ),
        );
    } catch (err) {
      logger.error({ err }, "deleteAllExpired failed");
    }
  }

  private generateUserId() {
    // ID with 120 bits of entropy, or about the same as UUID v4.
    const bytes = crypto.getRandomValues(new Uint8Array(15));
    const id = encodeBase32LowerCase(bytes);
    return id;
  }
}
