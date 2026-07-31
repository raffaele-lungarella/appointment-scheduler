import { err, ok } from "$lib/modules/result";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import { and, eq, ne } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";
import type { ServiceResult } from "./service-result";

const logger = createLogger("SessionService");

export class SessionService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async insert(session: table.NewSessionRow) {
    try {
      return await this.database.insert(table.session).values(session);
    } catch (e) {
      logger.error({ err: e, sessionId: session.id }, "insert failed");
      return null;
    }
  }

  async getByID(
    sessionID: string,
  ): Promise<ServiceResult<table.SessionRow, { type: "not-found" } | { type: "storage-error" }>> {
    try {
      const session = await this.database
        .select()
        .from(table.session)
        .where(eq(table.session.id, sessionID))
        .get();
      if (!session) return err({ type: "not-found" });
      return ok(session);
    } catch (e) {
      logger.error({ err: e, sessionId: sessionID }, "getByID failed");
      return err({ type: "storage-error" });
    }
  }

  async delete(sessionID: string) {
    try {
      return await this.database.delete(table.session).where(eq(table.session.id, sessionID));
    } catch (e) {
      logger.error({ err: e, sessionId: sessionID }, "delete failed");
      return null;
    }
  }

  async updatePasswordAndRevokeOtherSessions(
    userID: string,
    passwordHash: string,
    currentSessionID: string,
  ) {
    try {
      return await this.database.transaction(async (tx) => {
        const user = await tx
          .update(table.user)
          .set({ passwordHash })
          .where(eq(table.user.id, userID))
          .returning()
          .get();

        if (!user) throw new Error("Account is missing");

        await tx
          .delete(table.session)
          .where(and(eq(table.session.userID, userID), ne(table.session.id, currentSessionID)));
        return user;
      });
    } catch (e) {
      logger.error({ err: e, userId: userID }, "updatePasswordAndRevokeOtherSessions failed");
      return null;
    }
  }

  async deleteAllByUserID(userID: string) {
    try {
      return await this.database.delete(table.session).where(eq(table.session.userID, userID));
    } catch (e) {
      logger.error({ err: e, userId: userID }, "deleteAllByUserID failed");
      return null;
    }
  }
}
