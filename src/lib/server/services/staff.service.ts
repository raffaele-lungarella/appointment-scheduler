import type { StaffSummaryDTO } from "$lib/dto";
import { err, ok } from "$lib/modules/result";
import { avatarOriginalSchema, avatarSchema } from "$lib/modules/zod-schemas";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";

import { createLogger } from "../logger";
import { Service } from "./service";
import type { AffectedRows, ServiceResult } from "./service-result";

const logger = createLogger("StaffService");

const MAX_AVATAR_BYTES = 300_000;
const MAX_AVATAR_ORIGINAL_BYTES = 1_500_000;
const MAX_ABSOLUTE_OFFSET = 10_000;
const MAX_DISPLAY_SCALE = 100;

function isWithinDecodedByteLimit(dataUrl: string, maxBytes: number): boolean {
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex < 0) return false;

  const encoded = dataUrl.slice(separatorIndex + 1);
  if (encoded.length === 0 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    return false;
  }

  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return (encoded.length / 4) * 3 - padding <= maxBytes;
}

export class StaffService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  async getByUserID(userID: string) {
    try {
      return await this.database
        .select()
        .from(table.staff)
        .where(eq(table.staff.userID, userID))
        .get();
    } catch (e) {
      logger.error({ err: e, userId: userID }, "getByUserID failed");
      return null;
    }
  }

  async getAll(): Promise<StaffSummaryDTO[] | null> {
    try {
      const result = await this.database
        .select({
          name: table.user.name,
          id: table.staff.userID,
          avatar: table.staff.avatar,
        })
        .from(table.staff)
        .innerJoin(table.user, eq(table.user.id, table.staff.userID))
        .where(eq(table.staff.isActive, true));

      return result;
    } catch (e) {
      logger.error({ err: e }, "getAll failed");
      return null;
    }
  }

  async toggleActive(isActive: boolean, userID: string): Promise<ServiceResult<AffectedRows>> {
    if (typeof isActive !== "boolean" || !userID) return err({ type: "invalid-input" });

    try {
      const updated = await this.database
        .update(table.staff)
        .set({ isActive })
        .where(eq(table.staff.userID, userID))
        .returning({ userID: table.staff.userID });
      return updated.length === 1 ? ok({ affectedRows: 1 }) : err({ type: "not-found" });
    } catch (e) {
      logger.error({ err: e, userId: userID, isActive }, "toggleActive failed");
      return err({ type: "storage-error" });
    }
  }

  async deleteAvatar(userID: string): Promise<ServiceResult<AffectedRows>> {
    try {
      const deleted = await this.database
        .update(table.staff)
        .set({
          avatar: null,
          avatarOriginal: null,
          avatarOffsetX: null,
          avatarOffsetY: null,
          avatarDisplayScale: null,
        })
        .where(eq(table.staff.userID, userID))
        .returning({ userID: table.staff.userID });
      return deleted.length === 1 ? ok({ affectedRows: 1 }) : err({ type: "not-found" });
    } catch (e) {
      logger.error({ err: e, userId: userID }, "deleteAvatar failed");
      return err({ type: "storage-error" });
    }
  }

  async updateAvatar(
    userID: string,
    avatar: string,
    avatarOriginal: string,
    offsetX: number,
    offsetY: number,
    displayScale: number,
  ): Promise<boolean> {
    const parsedAvatar = avatarSchema.safeParse(avatar);
    if (!parsedAvatar.success) {
      logger.error(
        { err: parsedAvatar.error, userId: userID },
        "updateAvatar failed: invalid avatar",
      );
      return false;
    }

    const parsedOriginal = avatarOriginalSchema.safeParse(avatarOriginal);
    if (!parsedOriginal.success) {
      logger.error(
        { err: parsedOriginal.error, userId: userID },
        "updateAvatar failed: invalid original",
      );
      return false;
    }

    if (
      !isWithinDecodedByteLimit(parsedAvatar.data, MAX_AVATAR_BYTES) ||
      !isWithinDecodedByteLimit(parsedOriginal.data, MAX_AVATAR_ORIGINAL_BYTES) ||
      !Number.isFinite(offsetX) ||
      !Number.isFinite(offsetY) ||
      Math.abs(offsetX) > MAX_ABSOLUTE_OFFSET ||
      Math.abs(offsetY) > MAX_ABSOLUTE_OFFSET ||
      !Number.isFinite(displayScale) ||
      displayScale <= 0 ||
      displayScale > MAX_DISPLAY_SCALE
    ) {
      logger.warn({ userId: userID }, "updateAvatar rejected invalid size or crop geometry");
      return false;
    }

    try {
      const updated = await this.database
        .update(table.staff)
        .set({
          avatar: parsedAvatar.data,
          avatarOriginal: parsedOriginal.data,
          avatarOffsetX: offsetX,
          avatarOffsetY: offsetY,
          avatarDisplayScale: displayScale,
        })
        .where(eq(table.staff.userID, userID))
        .returning({ userID: table.staff.userID });
      return updated.length === 1;
    } catch (e) {
      logger.error({ err: e, userId: userID }, "updateAvatar failed");
      return false;
    }
  }
}
