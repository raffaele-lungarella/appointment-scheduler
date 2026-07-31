import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";

const logger = createLogger("CleanupService");

const cleanupSteps = [
  "expiredReservations",
  "expiredEmailVerifications",
  "expiredPasswordRecoveries",
  "expiredPublicTokens",
  "expiredRateLimits",
  "expiredUserReservations",
  "expiredUsers",
] as const;

type CleanupStep = (typeof cleanupSteps)[number];

export type CleanupFailure = {
  step: CleanupStep;
  message: string;
};

export type CleanupResult = {
  success: boolean;
  startedAt: string;
  finishedAt: string;
  counts: Record<CleanupStep, number>;
  failures: CleanupFailure[];
};

export class CleanupService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async deleteExpiredItems(): Promise<CleanupResult> {
    const startedAt = new Date();
    const counts = Object.fromEntries(cleanupSteps.map((step) => [step, 0])) as Record<
      CleanupStep,
      number
    >;
    const failures: CleanupFailure[] = [];
    const now = new Date();

    await this.runStep("expiredReservations", counts, failures, async () =>
      this.database
        .delete(table.reservation)
        .where(lt(table.reservation.expiresAt, now))
        .returning({ id: table.reservation.id }),
    );
    await this.runStep("expiredEmailVerifications", counts, failures, async () =>
      this.database
        .delete(table.emailVerification)
        .where(lt(table.emailVerification.expiresAt, now))
        .returning({ id: table.emailVerification.id }),
    );
    await this.runStep("expiredPasswordRecoveries", counts, failures, async () =>
      this.database
        .delete(table.passwordRecover)
        .where(lt(table.passwordRecover.expiresAt, now))
        .returning({ id: table.passwordRecover.id }),
    );
    await this.runStep("expiredPublicTokens", counts, failures, async () =>
      this.database
        .delete(table.publicToken)
        .where(lt(table.publicToken.expiresAt, now))
        .returning({ id: table.publicToken.tokenHash }),
    );
    await this.runStep("expiredRateLimits", counts, failures, async () =>
      this.database
        .delete(table.rateLimit)
        .where(lt(table.rateLimit.expiresAt, now))
        .returning({ id: table.rateLimit.keyHash }),
    );

    const expiredUsers = await this.getExpiredUsers(now, failures);
    if (expiredUsers) {
      const userIDs = expiredUsers.map(({ id }) => id);
      if (userIDs.length > 0) {
        await this.runStep("expiredUserReservations", counts, failures, async () =>
          this.database
            .delete(table.reservation)
            .where(inArray(table.reservation.ownerUserID, userIDs))
            .returning({ id: table.reservation.id }),
        );
        await this.runStep("expiredUsers", counts, failures, async () =>
          this.database
            .delete(table.user)
            .where(inArray(table.user.id, userIDs))
            .returning({ id: table.user.id }),
        );
      }
    }

    const result: CleanupResult = {
      success: failures.length === 0,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      counts,
      failures,
    };

    if (!result.success) logger.error({ result }, "deleteExpiredItems completed with failures");
    return result;
  }

  private async getExpiredUsers(now: Date, failures: CleanupFailure[]) {
    try {
      return await this.database
        .select({ id: table.user.id })
        .from(table.user)
        .where(
          and(
            eq(table.user.verifiedEmail, false),
            isNotNull(table.user.expiresAt),
            lt(table.user.expiresAt, now),
          ),
        );
    } catch (error) {
      const message = this.errorMessage(error);
      failures.push({ step: "expiredUsers", message: `selection failed: ${message}` });
      logger.error({ err: error }, "expired user selection failed");
      return null;
    }
  }

  private async runStep(
    step: CleanupStep,
    counts: Record<CleanupStep, number>,
    failures: CleanupFailure[],
    operation: () => Promise<unknown[]>,
  ) {
    try {
      counts[step] = (await operation()).length;
    } catch (error) {
      failures.push({ step, message: this.errorMessage(error) });
      logger.error({ err: error, step }, "cleanup step failed");
    }
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unknown cleanup error";
  }
}
