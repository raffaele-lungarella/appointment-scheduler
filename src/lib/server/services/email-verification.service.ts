import { insertEmailVerificationSchema } from "$lib/modules/zod-schemas";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import { eq, lt } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";

const logger = createLogger("EmailVerificationService");

/** @deprecated Raw verification tokens are legacy. Use PublicTokenService for new flows. */
export class EmailVerificationService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async insert(newEmail: string, userID: string) {
    const parsed = insertEmailVerificationSchema.safeParse({
      email: newEmail.toLowerCase().trim(),
      userID,
    });
    if (!parsed.success) {
      logger.error({ err: parsed.error }, "insert failed: invalid data");
      return null;
    }

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // Add one day

      return await this.database
        .insert(table.emailVerification)
        .values({
          id: crypto.randomUUID(),
          userID: parsed.data.userID,
          expiresAt,
          email: parsed.data.email,
        })
        .returning()
        .get();
    } catch (e) {
      logger.error({ err: e, userId: parsed.data.userID }, "insert failed");
      return null;
    }
  }

  async getByID(id: string) {
    try {
      return await this.database
        .select()
        .from(table.emailVerification)
        .where(eq(table.emailVerification.id, id))
        .get();
    } catch (e) {
      logger.error({ err: e, tokenId: id }, "getByID failed");
      return null;
    }
  }

  async delete(id: string) {
    try {
      return await this.database
        .delete(table.emailVerification)
        .where(eq(table.emailVerification.id, id));
    } catch (e) {
      logger.error({ err: e, tokenId: id }, "delete failed");
      return null;
    }
  }

  async deleteByUserID(userID: string) {
    try {
      return await this.database
        .delete(table.emailVerification)
        .where(eq(table.emailVerification.userID, userID));
    } catch (e) {
      logger.error({ err: e, userId: userID }, "deleteByUserID failed");
      return null;
    }
  }

  async deleteAllExpired() {
    try {
      return await this.database
        .delete(table.emailVerification)
        .where(lt(table.emailVerification.expiresAt, new Date()));
    } catch (e) {
      logger.error({ err: e }, "deleteAllExpired failed");
      return null;
    }
  }
}
