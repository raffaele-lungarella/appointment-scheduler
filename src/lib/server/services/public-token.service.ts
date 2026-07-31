import { err, ok, type Result } from "$lib/modules/result";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import { createLogger } from "$lib/server/logger";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase64url, encodeHexLowerCase } from "@oslojs/encoding";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";

import { reservationExpiresAt } from "./reservation.service";
import { Service } from "./service";
import type { AffectedRows, ServiceResult } from "./service-result";

const logger = createLogger("PublicTokenService");

export const publicTokenPurposes = [
  "reservation_access",
  "reservation_confirmation",
  "account_verification",
  "password_reset",
  "email_change",
] as const;

export type PublicTokenPurpose = (typeof publicTokenPurposes)[number];

type UserTokenPurpose = "account_verification" | "password_reset";
type ReservationTokenPurpose = "reservation_access" | "reservation_confirmation";

export type IssuePublicTokenInput =
  | {
      purpose: UserTokenPurpose;
      userID: string;
      reservationID?: never;
      pendingEmail?: never;
      expiresAt: Date;
    }
  | {
      purpose: "email_change";
      userID: string;
      pendingEmail: string;
      reservationID?: never;
      expiresAt: Date;
    }
  | {
      purpose: ReservationTokenPurpose;
      reservationID: string;
      userID?: never;
      pendingEmail?: never;
      expiresAt: Date;
    };

export type IssuePublicTokenError = "invalid-input" | "storage-error";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isIssuePublicTokenInput(input: unknown): input is IssuePublicTokenInput {
  if (!input || typeof input !== "object") return false;

  const candidate = input as Record<string, unknown>;
  if (!(candidate.expiresAt instanceof Date) || !Number.isFinite(candidate.expiresAt.getTime())) {
    return false;
  }

  switch (candidate.purpose) {
    case "account_verification":
    case "password_reset":
      return (
        isNonEmptyString(candidate.userID) &&
        candidate.reservationID === undefined &&
        candidate.pendingEmail === undefined
      );
    case "email_change":
      return (
        isNonEmptyString(candidate.userID) &&
        isNonEmptyString(candidate.pendingEmail) &&
        candidate.reservationID === undefined
      );
    case "reservation_access":
    case "reservation_confirmation":
      return (
        isNonEmptyString(candidate.reservationID) &&
        candidate.userID === undefined &&
        candidate.pendingEmail === undefined
      );
    default:
      return false;
  }
}

type PublicTokenOperationError = { type: "invalid-input" } | { type: "storage-error" };
type PublicTokenStorageError = { type: "storage-error" };

type TokenStatus =
  | { status: "valid"; token: table.PublicTokenRow }
  | { status: "expired" }
  | { status: "consumed" }
  | { status: "invalid" }
  | { status: "error" };

const tokenPrefixes: Record<PublicTokenPurpose, string> = {
  reservation_access: "ra",
  reservation_confirmation: "rc",
  account_verification: "ev",
  password_reset: "pr",
  email_change: "ec",
};

export function hashPublicToken(token: string) {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export function generatePublicToken(purpose: PublicTokenPurpose) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `${tokenPrefixes[purpose]}_${encodeBase64url(bytes).replace(/=+$/, "")}`;
}

export class PublicTokenService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async issue(input: IssuePublicTokenInput): Promise<Result<string, IssuePublicTokenError>> {
    if (!isIssuePublicTokenInput(input)) {
      logger.warn(
        { purpose: (input as { purpose?: unknown })?.purpose },
        "issue rejected structurally invalid input",
      );
      return err("invalid-input");
    }

    const rawToken = generatePublicToken(input.purpose);
    const tokenHash = hashPublicToken(rawToken);

    try {
      await this.database.transaction(async (tx) => {
        if (input.userID) {
          await tx
            .delete(table.publicToken)
            .where(
              and(
                eq(table.publicToken.userID, input.userID),
                eq(table.publicToken.purpose, input.purpose),
                isNull(table.publicToken.consumedAt),
              ),
            );
        }

        await tx.insert(table.publicToken).values({
          tokenHash,
          purpose: input.purpose,
          userID: input.userID,
          reservationID: input.reservationID,
          pendingEmail: input.pendingEmail,
          expiresAt: input.expiresAt,
        });
      });

      return ok(rawToken);
    } catch (error) {
      logger.error({ err: error, purpose: input.purpose }, "issue failed");
      return err("storage-error");
    }
  }

  async inspect(rawToken: string, purpose: PublicTokenPurpose): Promise<TokenStatus> {
    const tokenHash = hashPublicToken(rawToken);

    try {
      const token = await this.database
        .select()
        .from(table.publicToken)
        .where(
          and(eq(table.publicToken.tokenHash, tokenHash), eq(table.publicToken.purpose, purpose)),
        )
        .get();

      if (!token) return { status: "invalid" };
      if (token.consumedAt) return { status: "consumed" };
      if (Date.now() >= token.expiresAt.getTime()) return { status: "expired" };

      return { status: "valid", token };
    } catch (error) {
      logger.error({ err: error, tokenHash, purpose }, "inspect failed");
      return { status: "error" };
    }
  }

  async consume(
    rawToken: string,
    purpose: PublicTokenPurpose,
  ): Promise<ServiceResult<AffectedRows, PublicTokenOperationError>> {
    const tokenHash = hashPublicToken(rawToken);

    try {
      const consumed = await this.database
        .update(table.publicToken)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(table.publicToken.tokenHash, tokenHash),
            eq(table.publicToken.purpose, purpose),
            isNull(table.publicToken.consumedAt),
            gt(table.publicToken.expiresAt, new Date()),
          ),
        )
        .returning({ tokenHash: table.publicToken.tokenHash });

      if (consumed.length === 0) return err({ type: "invalid-input" });
      return ok({ affectedRows: consumed.length });
    } catch (error) {
      logger.error({ err: error, tokenHash, purpose }, "consume failed");
      return err({ type: "storage-error" });
    }
  }

  async verifyAccount(
    rawToken: string,
  ): Promise<ServiceResult<table.UserRow, PublicTokenOperationError>> {
    const tokenHash = hashPublicToken(rawToken);

    try {
      return await this.database
        .transaction(async (tx) => {
          const token = await tx
            .update(table.publicToken)
            .set({ consumedAt: new Date() })
            .where(
              and(
                eq(table.publicToken.tokenHash, tokenHash),
                eq(table.publicToken.purpose, "account_verification"),
                isNull(table.publicToken.consumedAt),
                gt(table.publicToken.expiresAt, new Date()),
              ),
            )
            .returning({ userID: table.publicToken.userID })
            .get();

          if (!token?.userID) return null;

          const user = await tx
            .update(table.user)
            .set({ verifiedEmail: true, expiresAt: null })
            .where(and(eq(table.user.id, token.userID), eq(table.user.verifiedEmail, false)))
            .returning()
            .get();

          if (!user) throw new Error("Account is missing or already verified");
          return user;
        })
        .then((user) => (user ? ok(user) : err({ type: "invalid-input" })));
    } catch (error) {
      logger.error({ err: error, tokenHash }, "verifyAccount failed");
      return err({ type: "storage-error" });
    }
  }

  async confirmEmailChange(
    rawToken: string,
    userID: string,
    currentSessionID: string,
  ): Promise<ServiceResult<table.UserRow, PublicTokenOperationError>> {
    const tokenHash = hashPublicToken(rawToken);

    try {
      return await this.database
        .transaction(async (tx) => {
          const token = await tx
            .update(table.publicToken)
            .set({ consumedAt: new Date() })
            .where(
              and(
                eq(table.publicToken.tokenHash, tokenHash),
                eq(table.publicToken.purpose, "email_change"),
                eq(table.publicToken.userID, userID),
                isNull(table.publicToken.consumedAt),
                gt(table.publicToken.expiresAt, new Date()),
              ),
            )
            .returning({ pendingEmail: table.publicToken.pendingEmail })
            .get();

          if (!token?.pendingEmail) return null;

          const user = await tx
            .update(table.user)
            .set({ email: token.pendingEmail.toLowerCase().trim() })
            .where(eq(table.user.id, userID))
            .returning()
            .get();

          if (!user) throw new Error("Account is missing");

          await tx
            .delete(table.session)
            .where(
              and(
                eq(table.session.userID, userID),
                sql`${table.session.id} != ${currentSessionID}`,
              ),
            );
          return user;
        })
        .then((user) => (user ? ok(user) : err({ type: "invalid-input" })));
    } catch (error) {
      logger.error({ err: error, tokenHash, userId: userID }, "confirmEmailChange failed");
      return err({ type: "storage-error" });
    }
  }

  async resetPassword(
    rawToken: string,
    passwordHash: string,
  ): Promise<ServiceResult<string, PublicTokenOperationError>> {
    const tokenHash = hashPublicToken(rawToken);

    try {
      return await this.database
        .transaction(async (tx) => {
          const token = await tx
            .update(table.publicToken)
            .set({ consumedAt: new Date() })
            .where(
              and(
                eq(table.publicToken.tokenHash, tokenHash),
                eq(table.publicToken.purpose, "password_reset"),
                isNull(table.publicToken.consumedAt),
                gt(table.publicToken.expiresAt, new Date()),
              ),
            )
            .returning({ userID: table.publicToken.userID })
            .get();

          if (!token?.userID) return null;

          const user = await tx
            .update(table.user)
            .set({ passwordHash })
            .where(eq(table.user.id, token.userID))
            .returning({ id: table.user.id })
            .get();

          if (!user) throw new Error("Account is missing");
          await tx.delete(table.session).where(eq(table.session.userID, user.id));
          return user.id;
        })
        .then((userID) => (userID ? ok(userID) : err({ type: "invalid-input" })));
    } catch (error) {
      logger.error({ err: error, tokenHash }, "resetPassword failed");
      return err({ type: "storage-error" });
    }
  }

  async confirmReservation(
    rawToken: string,
  ): Promise<ServiceResult<string, PublicTokenOperationError>> {
    const tokenHash = hashPublicToken(rawToken);

    try {
      const reservationID = await this.database.transaction(async (tx) => {
        const token = await tx
          .update(table.publicToken)
          .set({ consumedAt: new Date() })
          .where(
            and(
              eq(table.publicToken.tokenHash, tokenHash),
              eq(table.publicToken.purpose, "reservation_confirmation"),
              isNull(table.publicToken.consumedAt),
              gt(table.publicToken.expiresAt, new Date()),
            ),
          )
          .returning({ reservationID: table.publicToken.reservationID })
          .get();

        if (!token?.reservationID) return null;

        const reservationDate = await tx
          .select({ date: table.reservation.date })
          .from(table.reservation)
          .where(eq(table.reservation.id, token.reservationID))
          .get();
        if (!reservationDate) throw new Error("Reservation is missing");

        const reservation = await tx
          .update(table.reservation)
          .set({
            pending: false,
            expiresAt: reservationExpiresAt(reservationDate.date),
          })
          .where(
            and(eq(table.reservation.id, token.reservationID), eq(table.reservation.pending, true)),
          )
          .returning({ id: table.reservation.id })
          .get();

        if (!reservation) {
          throw new Error("Reservation is missing or already confirmed");
        }

        return reservation.id;
      });

      return reservationID ? ok(reservationID) : err({ type: "invalid-input" });
    } catch (error) {
      logger.error({ err: error, tokenHash }, "confirmReservation failed");
      return err({ type: "storage-error" });
    }
  }

  async revoke(
    rawToken: string,
    purpose: PublicTokenPurpose,
  ): Promise<ServiceResult<AffectedRows, PublicTokenStorageError>> {
    const tokenHash = hashPublicToken(rawToken);
    try {
      const revoked = await this.database
        .delete(table.publicToken)
        .where(
          and(eq(table.publicToken.tokenHash, tokenHash), eq(table.publicToken.purpose, purpose)),
        )
        .returning({ tokenHash: table.publicToken.tokenHash });
      return ok({ affectedRows: revoked.length });
    } catch (error) {
      logger.error({ err: error, tokenHash, purpose }, "revoke failed");
      return err({ type: "storage-error" });
    }
  }

  async deleteByUserID(
    userID: string,
  ): Promise<ServiceResult<AffectedRows, PublicTokenStorageError>> {
    try {
      const deleted = await this.database
        .delete(table.publicToken)
        .where(eq(table.publicToken.userID, userID))
        .returning({ tokenHash: table.publicToken.tokenHash });
      return ok({ affectedRows: deleted.length });
    } catch (error) {
      logger.error({ err: error, userId: userID }, "deleteByUserID failed");
      return err({ type: "storage-error" });
    }
  }

  async deleteAllExpired(): Promise<ServiceResult<AffectedRows, PublicTokenStorageError>> {
    try {
      const deleted = await this.database
        .delete(table.publicToken)
        .where(lt(table.publicToken.expiresAt, new Date()))
        .returning({ tokenHash: table.publicToken.tokenHash });
      return ok({ affectedRows: deleted.length });
    } catch (error) {
      logger.error({ err: error }, "deleteAllExpired failed");
      return err({ type: "storage-error" });
    }
  }
}
