import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import { eq, lt } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";

const logger = createLogger("PasswordRecoverService");

/** @deprecated Raw password-recovery tokens are legacy. Use PublicTokenService for new flows. */
export class PasswordRecoverService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async insert(userID: string) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // Add one day

      return await this.database
        .insert(table.passwordRecover)
        .values({
          id: crypto.randomUUID(),
          userID,
          expiresAt,
        })
        .returning()
        .get();
    } catch (e) {
      logger.error({ err: e, userId: userID }, "insert failed");
      return null;
    }
  }

  async getByID(id: string) {
    try {
      return await this.database
        .select()
        .from(table.passwordRecover)
        .where(eq(table.passwordRecover.id, id))
        .get();
    } catch (e) {
      logger.error({ err: e, tokenId: id }, "getByID failed");
      return null;
    }
  }

  async expire(id: string) {
    try {
      return await this.database
        .update(table.passwordRecover)
        .set({ expiresAt: null })
        .where(eq(table.passwordRecover.id, id))
        .returning()
        .get();
    } catch (e) {
      logger.error({ err: e, tokenId: id }, "expire failed");
      return null;
    }
  }

  async deleteByUserID(userID: string) {
    try {
      return await this.database
        .delete(table.passwordRecover)
        .where(eq(table.passwordRecover.userID, userID));
    } catch (e) {
      logger.error({ err: e, userId: userID }, "deleteByUserID failed");
      return null;
    }
  }

  async deleteAllExpired() {
    try {
      return await this.database
        .delete(table.passwordRecover)
        .where(lt(table.passwordRecover.expiresAt, new Date()));
    } catch (e) {
      logger.error({ err: e }, "deleteAllExpired failed");
      return null;
    }
  }
}
