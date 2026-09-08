import { LOCK_DURATION } from "$lib/constants";
import { createMinuteOfDay, formatMinuteOfDay, type MinuteOfDay } from "$lib/domain/minute-of-day";
import type { ReservationDTO } from "$lib/dto";
import { err, ok, type Result } from "$lib/modules/result";
import type { Database } from "$lib/server/db/client";
import { getProductionDatabase } from "$lib/server/db/production";
import * as table from "$lib/server/db/schema";
import type { UserRow } from "$lib/server/db/schema";
import type { AnonymousData, StaffData, UsualData } from "$lib/shared";
import { parseDate, parseDateTime } from "@internationalized/date";
import { anonymousUserSchema, staffUserSchema, usualUserSchema } from "@schema";
import { and, asc, eq, gt, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core/alias";

import { createLogger } from "../logger";
import { Service } from "./service";
import type { AffectedRows, ServiceResult } from "./service-result";

const logger = createLogger("ReservationService");

export type ReservationInsertError =
  | { type: "invalid-data"; reason: "request-schema-invalid" }
  | { type: "invalid-data"; reason: "duplicate-offerings" }
  | { type: "invalid-data"; reason: "invalid-appointment-format" }
  | { type: "invalid-data"; reason: "appointment-not-in-future" }
  | { type: "invalid-data"; reason: "staff-not-active" }
  | {
      type: "invalid-data";
      reason: "offerings-unavailable-for-staff";
      requestedOfferingIDs: string[];
      availableOfferingIDs: string[];
    }
  | {
      type: "invalid-data";
      reason: "invalid-offering-duration";
      offerings: { id: string; duration: number }[];
    }
  | {
      type: "invalid-data";
      reason: "outside-staff-schedule";
      requestedStartMinutes: number;
      requestedEndMinutes: number;
      scheduleRanges: {
        startHour: number;
        startMinute: number;
        endHour: number;
        endMinute: number;
      }[];
    }
  | { type: "invalid-data"; reason: "staff-shutdown"; shutdownID: string }
  | { type: "invalid-data"; reason: "slot-policy-not-configured" }
  | {
      type: "invalid-data";
      reason: "appointment-not-slot-aligned";
      requestedStartMinutes: number;
      requestedDurationMinutes: number;
      slotDurationMinutes: number;
    }
  | { type: "conflict"; reason: "slots-occupied" }
  | { type: "server-error" };

type InvalidReservationInsertError = Extract<ReservationInsertError, { type: "invalid-data" }>;
type InsertReservation = typeof table.reservation.$inferInsert & { startMinute: MinuteOfDay };
type ReservationOffering = ReservationDTO["offerings"][number];
type OccupancyMask = {
  slotDurationMinutes: number;
  slotStart: number;
  slotCount: number;
  bitsLow: number;
  bitsHigh: number;
};

type ReservationRow = Omit<ReservationDTO, "offerings"> & {
  offering: ReservationOffering;
  position: number;
};

type ReservationStorageError = { type: "storage-error" };
type ReservationLookupError = { type: "not-found" } | ReservationStorageError;
export type ReservationBatchDeleteResult = AffectedRows & { requestedRows: number };

export type OccupiedReservationSlot = {
  date: string;
  startMinute: MinuteOfDay;
  staff: { id: string };
  offerings: { duration: number }[];
};

const BUSINESS_TIME_ZONE = "Europe/Rome";

/** Canonical deadline shared by a pending reservation and its confirmation credential. */
export function reservationConfirmationExpiresAt(now = Date.now()): Date {
  return new Date(now + LOCK_DURATION);
}

/** Canonical retention boundary for confirmed reservations: next midnight in Europe/Rome. */
export function reservationExpiresAt(date: string): Date {
  return parseDate(date).add({ days: 1 }).toDate(BUSINESS_TIME_ZONE);
}

export class ReservationService extends Service {
  constructor(private readonly database: Database = getProductionDatabase()) {
    super();
  }

  private getReservationRows() {
    const staffUser = alias(table.user, "staffUser");
    const customerUser = alias(table.user, "customerUser");

    return this.database
      .select({
        id: table.reservation.id,
        date: table.reservation.date,
        startMinute: table.reservation.startMinute,
        name: table.reservation.name,
        email: table.reservation.email,
        phoneNumber: table.reservation.phoneNumber,
        pending: table.reservation.pending,
        expiresAt: table.reservation.expiresAt,
        staff: {
          id: staffUser.id,
          name: staffUser.name,
        },
        offering: {
          id: table.offering.id,
          duration: table.offering.duration,
          name: table.offering.name,
          price: table.offering.price,
        },
        position: table.reservationOffering.position,
        user: {
          name: customerUser.name,
          email: customerUser.email,
          id: customerUser.id,
        },
      })
      .from(table.reservation)
      .innerJoin(
        table.reservationOffering,
        eq(table.reservation.id, table.reservationOffering.reservationID),
      )
      .innerJoin(table.offering, eq(table.reservationOffering.offeringID, table.offering.id))
      .innerJoin(table.staff, eq(table.reservation.staffID, table.staff.userID))
      .innerJoin(staffUser, eq(table.staff.userID, staffUser.id))
      .leftJoin(customerUser, eq(table.reservation.ownerUserID, customerUser.id))
      .orderBy(asc(table.reservation.id), asc(table.reservationOffering.position));
  }

  private aggregateReservations(rows: ReservationRow[]): ReservationDTO[] {
    const reservations = new Map<string, ReservationDTO>();

    for (const { offering, position: _position, ...row } of rows) {
      const existing = reservations.get(row.id);
      if (existing) {
        existing.offerings.push(offering);
      } else {
        reservations.set(row.id, { ...row, offerings: [offering] });
      }
    }

    return [...reservations.values()];
  }

  private async findReservations(where: SQL | undefined) {
    const rows = await this.getReservationRows().where(where);
    return this.aggregateReservations(rows as ReservationRow[]);
  }

  private validateOfferingIDs(offerings: string[]): boolean {
    return offerings.length > 0 && new Set(offerings).size === offerings.length;
  }

  /** The reservation remains retained until the next Europe/Rome midnight (exclusive). */
  private nextRomeMidnight(date: string): Date {
    return reservationExpiresAt(date);
  }

  async insertByUser(
    data: UsualData,
    user: Pick<UserRow, "id" | "name" | "phoneNumber" | "email">,
  ): Promise<Result<ReservationDTO, ReservationInsertError>> {
    try {
      const schema = usualUserSchema.safeParse({ ...data, date: data.date?.toString() });
      if (!schema.success || !this.validateOfferingIDs(schema.data.offerings)) {
        logger.error(
          { issues: schema.success ? "duplicate-offerings" : schema.error.issues, userId: user.id },
          "insertByUser validation failed",
        );
        return err({
          type: "invalid-data",
          reason: schema.success ? "duplicate-offerings" : "request-schema-invalid",
        });
      }

      const { date, startMinute, offerings, staff } = schema.data;
      return await this.insertAndFetch(
        {
          date,
          hour: formatMinuteOfDay(startMinute),
          startMinute,
          id: crypto.randomUUID(),
          name: user.name,
          phoneNumber: user.phoneNumber,
          email: user.email,
          ownerUserID: user.id,
          pending: false,
          expiresAt: this.nextRomeMidnight(date),
          staffID: staff,
        },
        offerings,
        { userId: user.id, source: "insertByUser" },
      );
    } catch (e) {
      logger.error({ err: e, userId: user.id }, "insertByUser failed");
      return err({ type: "server-error" });
    }
  }

  async insertByAnonymous(
    data: AnonymousData,
  ): Promise<Result<ReservationDTO, ReservationInsertError>> {
    try {
      const schema = anonymousUserSchema.safeParse({
        ...data,
        email: data.email.toLowerCase().trim(),
        date: data.date?.toString(),
      });
      if (!schema.success || !this.validateOfferingIDs(schema.data.offerings)) {
        logger.warn(
          { reason: schema.success ? "duplicate-offerings" : schema.error.issues[0]?.path },
          "insertByAnonymous validation failed",
        );
        return err({
          type: "invalid-data",
          reason: schema.success ? "duplicate-offerings" : "request-schema-invalid",
        });
      }

      const reservation: InsertReservation = {
        date: schema.data.date,
        hour: formatMinuteOfDay(schema.data.startMinute),
        startMinute: schema.data.startMinute,
        id: crypto.randomUUID(),
        name: schema.data.name,
        phoneNumber: schema.data.phone ?? null,
        email: schema.data.email,
        expiresAt: reservationConfirmationExpiresAt(),
        pending: true,
        staffID: schema.data.staff,
      };
      return await this.insertAndFetch(reservation, schema.data.offerings, {
        email: schema.data.email,
        source: "insertByAnonymous",
      });
    } catch (e) {
      logger.error({ err: e }, "insertByAnonymous failed");
      return err({ type: "server-error" });
    }
  }

  async insertByStaff(
    data: StaffData,
    user: Pick<UserRow, "id" | "email">,
  ): Promise<Result<ReservationDTO, ReservationInsertError>> {
    try {
      const schema = staffUserSchema.safeParse({
        ...data,
        date: data.date?.toString(),
      });
      if (!schema.success || !this.validateOfferingIDs(schema.data.offerings)) {
        logger.error(
          {
            issues: schema.success ? "duplicate-offerings" : schema.error.issues,
            staffId: user.id,
          },
          "insertByStaff validation failed",
        );
        return err({
          type: "invalid-data",
          reason: schema.success ? "duplicate-offerings" : "request-schema-invalid",
        });
      }

      const { date, startMinute, offerings, staff, name, phone } = schema.data;
      return await this.insertAndFetch(
        {
          date,
          hour: formatMinuteOfDay(startMinute),
          startMinute,
          id: crypto.randomUUID(),
          name,
          email: user.email,
          pending: false,
          expiresAt: this.nextRomeMidnight(date),
          staffID: staff,
          phoneNumber: phone ?? null,
        },
        offerings,
        { staffId: user.id, source: "insertByStaff" },
      );
    } catch (e) {
      logger.error({ err: e, staffId: user.id }, "insertByStaff failed");
      return err({ type: "server-error" });
    }
  }

  private async insertAndFetch(
    reservation: InsertReservation,
    offeringIDs: string[],
    logContext: Record<string, unknown>,
  ): Promise<Result<ReservationDTO, ReservationInsertError>> {
    const inserted = await this.insertWithAvailabilityCheck(reservation, offeringIDs);
    if (inserted.isErr()) {
      const log =
        inserted.error.type === "server-error"
          ? logger.error.bind(logger)
          : logger.warn.bind(logger);
      log({ ...logContext, error: inserted.error }, `${logContext.source} rejected reservation`);
      return err(inserted.error);
    }

    const fullReservation = await this.getByID(reservation.id);
    if (fullReservation.isErr()) {
      logger.error(
        { ...logContext, reservationId: reservation.id, error: fullReservation.error },
        "post-insert fetch failed",
      );
      return err({ type: "server-error" });
    }
    return ok(fullReservation.value);
  }

  async getAll(): Promise<ServiceResult<ReservationDTO[], ReservationStorageError>> {
    try {
      return ok(await this.findReservations(gt(table.reservation.expiresAt, new Date())));
    } catch (e) {
      logger.error({ err: e }, "getAll failed");
      return err({ type: "storage-error" });
    }
  }

  async getOccupiedSlots(): Promise<
    ServiceResult<OccupiedReservationSlot[], ReservationStorageError>
  > {
    try {
      const reservations = await this.findReservations(gt(table.reservation.expiresAt, new Date()));
      return ok(
        reservations.map((reservation) => ({
          date: reservation.date,
          startMinute: reservation.startMinute,
          staff: { id: reservation.staff.id },
          offerings: reservation.offerings.map(({ duration }) => ({ duration })),
        })),
      );
    } catch (e) {
      logger.error({ err: e }, "getOccupiedSlots failed");
      return err({ type: "storage-error" });
    }
  }

  async getTodayReservations(
    date: string,
    staffID: string,
  ): Promise<ServiceResult<ReservationDTO[], ReservationStorageError>> {
    try {
      return ok(
        await this.findReservations(
          and(
            eq(table.reservation.date, date),
            eq(table.reservation.pending, false),
            eq(table.staff.userID, staffID),
          ),
        ),
      );
    } catch (error) {
      logger.error({ err: error, date, staffId: staffID }, "getTodayReservations failed");
      return err({ type: "storage-error" });
    }
  }

  private visibleToCustomerCondition() {
    return or(eq(table.reservation.pending, false), gt(table.reservation.expiresAt, new Date()));
  }

  private async claimLegacyReservations(userID: string, email: string, id?: string) {
    const conditions = [
      isNull(table.reservation.ownerUserID),
      eq(table.reservation.email, email.toLowerCase().trim()),
    ];
    if (id) conditions.push(eq(table.reservation.id, id));

    await this.database
      .update(table.reservation)
      .set({ ownerUserID: userID })
      .where(and(...conditions));
  }

  async getByUser(
    userID: string,
    email: string,
  ): Promise<ServiceResult<ReservationDTO[], ReservationStorageError>> {
    try {
      await this.claimLegacyReservations(userID, email);
      return ok(
        await this.findReservations(
          and(eq(table.reservation.ownerUserID, userID), this.visibleToCustomerCondition()),
        ),
      );
    } catch (e) {
      logger.error({ err: e, userId: userID }, "getByUser failed");
      return err({ type: "storage-error" });
    }
  }

  async getByIDForUser(
    id: string,
    userID: string,
    email: string,
  ): Promise<ServiceResult<ReservationDTO, ReservationLookupError>> {
    try {
      await this.claimLegacyReservations(userID, email, id);
      const reservations = await this.findReservations(
        and(
          eq(table.reservation.id, id),
          eq(table.reservation.ownerUserID, userID),
          this.visibleToCustomerCondition(),
        ),
      );
      return reservations[0] ? ok(reservations[0]) : err({ type: "not-found" });
    } catch (e) {
      logger.error({ err: e, reservationId: id, userId: userID }, "getByIDForUser failed");
      return err({ type: "storage-error" });
    }
  }

  async getByID(id: string): Promise<ServiceResult<ReservationDTO, ReservationLookupError>> {
    try {
      const reservations = await this.findReservations(eq(table.reservation.id, id));
      return reservations[0] ? ok(reservations[0]) : err({ type: "not-found" });
    } catch (e) {
      logger.error({ err: e, reservationId: id }, "getByID failed");
      return err({ type: "storage-error" });
    }
  }

  private async deleteWhere(
    where: SQL,
    context: Record<string, unknown>,
  ): Promise<ServiceResult<AffectedRows, ReservationLookupError>> {
    try {
      const deleted = await this.database
        .delete(table.reservation)
        .where(where)
        .returning({ id: table.reservation.id });
      return deleted.length === 1 ? ok({ affectedRows: 1 }) : err({ type: "not-found" });
    } catch (e) {
      logger.error({ err: e, ...context }, "reservation deletion failed");
      return err({ type: "storage-error" });
    }
  }

  async delete(id: string): Promise<ServiceResult<AffectedRows, ReservationLookupError>> {
    return this.deleteWhere(eq(table.reservation.id, id), { reservationId: id });
  }

  async deleteByStaff(
    id: string,
    staffID: string,
  ): Promise<ServiceResult<AffectedRows, ReservationLookupError>> {
    return this.deleteWhere(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      and(eq(table.reservation.id, id), eq(table.reservation.staffID, staffID))!,
      { reservationId: id, staffId: staffID },
    );
  }

  async deleteByUser(
    id: string,
    userID: string,
    email: string,
  ): Promise<ServiceResult<AffectedRows, ReservationLookupError>> {
    try {
      await this.claimLegacyReservations(userID, email, id);
      return await this.deleteWhere(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        and(eq(table.reservation.id, id), eq(table.reservation.ownerUserID, userID))!,
        { reservationId: id, userId: userID },
      );
    } catch (e) {
      logger.error({ err: e, reservationId: id, userId: userID }, "deleteByUser failed");
      return err({ type: "storage-error" });
    }
  }

  async deleteManyByUser(
    ids: string[],
    userID: string,
    email: string,
  ): Promise<ServiceResult<ReservationBatchDeleteResult, ReservationStorageError>> {
    try {
      if (ids.length === 0) return ok({ requestedRows: 0, affectedRows: 0 });
      await this.claimLegacyReservations(userID, email);
      const deleted = await this.database
        .delete(table.reservation)
        .where(and(inArray(table.reservation.id, ids), eq(table.reservation.ownerUserID, userID)))
        .returning({ id: table.reservation.id });
      return ok({ requestedRows: ids.length, affectedRows: deleted.length });
    } catch (e) {
      logger.error({ err: e, reservationIds: ids, userId: userID }, "deleteManyByUser failed");
      return err({ type: "storage-error" });
    }
  }

  async deleteAllByStaff(
    staffID: string,
  ): Promise<ServiceResult<AffectedRows, ReservationStorageError>> {
    try {
      const deleted = await this.database
        .delete(table.reservation)
        .where(eq(table.reservation.staffID, staffID))
        .returning({ id: table.reservation.id });
      return ok({ affectedRows: deleted.length });
    } catch (e) {
      logger.error({ err: e, staffId: staffID }, "deleteAllByStaff failed");
      return err({ type: "storage-error" });
    }
  }

  async deleteAllByUser(
    userID: string,
    email: string,
  ): Promise<ServiceResult<AffectedRows, ReservationStorageError>> {
    try {
      await this.claimLegacyReservations(userID, email);
      const deleted = await this.database
        .delete(table.reservation)
        .where(eq(table.reservation.ownerUserID, userID))
        .returning({ id: table.reservation.id });
      return ok({ affectedRows: deleted.length });
    } catch (e) {
      logger.error({ err: e, userId: userID }, "deleteAllByUser failed");
      return err({ type: "storage-error" });
    }
  }

  private createOccupancyMask(
    startMinutes: number,
    durationMinutes: number,
    slotDurationMinutes: number,
  ): OccupancyMask | null {
    if (
      !Number.isInteger(slotDurationMinutes) ||
      slotDurationMinutes < 15 ||
      1440 % slotDurationMinutes !== 0 ||
      startMinutes % slotDurationMinutes !== 0
    ) {
      return null;
    }

    const slotStart = startMinutes / slotDurationMinutes;
    const slotCount = Math.ceil(durationMinutes / slotDurationMinutes);
    const totalSlots = 1440 / slotDurationMinutes;
    if (slotCount <= 0 || slotStart + slotCount > totalSlots || totalSlots > 96) return null;

    let bitsLow = 0n;
    let bitsHigh = 0n;
    for (let slot = slotStart; slot < slotStart + slotCount; slot++) {
      if (slot < 48) bitsLow |= 1n << BigInt(slot);
      else bitsHigh |= 1n << BigInt(slot - 48);
    }

    return {
      slotDurationMinutes,
      slotStart,
      slotCount,
      bitsLow: Number(bitsLow),
      bitsHigh: Number(bitsHigh),
    };
  }

  private parseAppointment(
    date: string,
    startMinute: MinuteOfDay,
  ): { startsAt: Date; day: number } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

    try {
      const calendarDate = parseDate(date);
      const startsAt = parseDateTime(`${date}T${formatMinuteOfDay(startMinute)}`).toDate(
        BUSINESS_TIME_ZONE,
      );
      // Database weekdays are Monday=0 through Sunday=6.
      const day =
        (new Date(
          Date.UTC(calendarDate.year, calendarDate.month - 1, calendarDate.day),
        ).getUTCDay() +
          6) %
        7;
      return { startsAt, day };
    } catch {
      return null;
    }
  }

  private isDatabaseContention(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /SQLITE_BUSY|database is locked|transaction conflict/i.test(message);
  }

  private rejectInvalidReservation<E extends InvalidReservationInsertError>(
    reservation: InsertReservation,
    error: E,
  ): Result<table.ReservationRow, E> {
    logger.warn(
      {
        error,
        reservationId: reservation.id,
        staffId: reservation.staffID,
        date: reservation.date,
        startMinute: reservation.startMinute,
      },
      "reservation rejected by availability validation",
    );
    return err(error);
  }

  private async insertWithAvailabilityCheck(
    reservation: InsertReservation,
    offeringIDs: string[],
  ): Promise<Result<table.ReservationRow, ReservationInsertError>> {
    const maximumAttempts = 10;
    for (let attempt = 1; attempt <= maximumAttempts; attempt++) {
      try {
        return await this.database.transaction(async (tx) => {
          const requestedStart = createMinuteOfDay(reservation.startMinute);
          const appointment = this.parseAppointment(reservation.date, requestedStart);
          if (!appointment) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "invalid-appointment-format",
            });
          }
          if (appointment.startsAt.getTime() <= Date.now()) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "appointment-not-in-future",
            });
          }

          const [activeStaff] = await tx
            .select({ id: table.staff.userID })
            .from(table.staff)
            .where(and(eq(table.staff.userID, reservation.staffID), eq(table.staff.isActive, true)))
            .limit(1);
          if (!activeStaff) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "staff-not-active",
            });
          }

          const requestedOfferings = await tx
            .select({
              id: table.offering.id,
              duration: table.offering.duration,
            })
            .from(table.offering)
            .where(
              and(
                inArray(table.offering.id, offeringIDs),
                eq(table.offering.staffID, reservation.staffID),
                eq(table.offering.active, true),
              ),
            );

          if (requestedOfferings.length !== offeringIDs.length) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "offerings-unavailable-for-staff",
              requestedOfferingIDs: offeringIDs,
              availableOfferingIDs: requestedOfferings.map(({ id }) => id),
            });
          }

          const requestedDuration = requestedOfferings.reduce(
            (sum, offering) => sum + offering.duration,
            0,
          );
          const requestedEnd = requestedStart + requestedDuration;
          if (
            requestedOfferings.some(
              (offering) => !Number.isInteger(offering.duration) || offering.duration <= 0,
            )
          ) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "invalid-offering-duration",
              offerings: requestedOfferings.map(({ id, duration }) => ({ id, duration })),
            });
          }

          const scheduleRanges = await tx
            .select({
              startHour: table.schedule.startHour,
              startMinute: table.schedule.startMinute,
              endHour: table.schedule.endHour,
              endMinute: table.schedule.endMinute,
            })
            .from(table.schedule)
            .where(
              and(
                eq(table.schedule.staffID, reservation.staffID),
                eq(table.schedule.day, appointment.day),
              ),
            );
          const containedBySchedule = scheduleRanges.some((range) => {
            const rangeStart = range.startHour * 60 + range.startMinute;
            const rangeEnd = range.endHour * 60 + range.endMinute;
            return requestedStart >= rangeStart && requestedEnd <= rangeEnd;
          });
          if (!containedBySchedule) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "outside-staff-schedule",
              requestedStartMinutes: requestedStart,
              requestedEndMinutes: requestedEnd,
              scheduleRanges,
            });
          }

          const [shutdown] = await tx
            .select({ id: table.shutdowns.id })
            .from(table.shutdowns)
            .where(
              and(
                eq(table.shutdowns.staffID, reservation.staffID),
                sql`${table.shutdowns.start} <= ${reservation.date}`,
                sql`${table.shutdowns.end} >= ${reservation.date}`,
              ),
            )
            .limit(1);
          if (shutdown) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "staff-shutdown",
              shutdownID: shutdown.id,
            });
          }

          const existingOccupancy = await tx
            .select({ slotDurationMinutes: table.reservationDayOccupancy.slotDurationMinutes })
            .from(table.reservationDayOccupancy)
            .where(
              and(
                eq(table.reservationDayOccupancy.staffID, reservation.staffID),
                eq(table.reservationDayOccupancy.date, reservation.date),
              ),
            )
            .get();
          const policy = existingOccupancy
            ? null
            : await tx
                .select({ slotDurationMinutes: table.reservationSlotPolicy.slotDurationMinutes })
                .from(table.reservationSlotPolicy)
                .where(sql`${table.reservationSlotPolicy.effectiveFromDate} <= ${reservation.date}`)
                .orderBy(sql`${table.reservationSlotPolicy.effectiveFromDate} DESC`)
                .limit(1)
                .get();
          const slotDurationMinutes =
            existingOccupancy?.slotDurationMinutes ?? policy?.slotDurationMinutes;
          if (!slotDurationMinutes) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "slot-policy-not-configured",
            });
          }

          const occupancy = this.createOccupancyMask(
            requestedStart,
            requestedDuration,
            slotDurationMinutes,
          );
          if (!occupancy) {
            return this.rejectInvalidReservation(reservation, {
              type: "invalid-data",
              reason: "appointment-not-slot-aligned",
              requestedStartMinutes: requestedStart,
              requestedDurationMinutes: requestedDuration,
              slotDurationMinutes,
            });
          }

          await tx
            .delete(table.reservation)
            .where(
              and(
                eq(table.reservation.staffID, reservation.staffID),
                eq(table.reservation.date, reservation.date),
                lt(table.reservation.expiresAt, new Date()),
              ),
            );

          await tx
            .insert(table.reservationDayOccupancy)
            .values({
              staffID: reservation.staffID,
              date: reservation.date,
              slotDurationMinutes,
            })
            .onConflictDoNothing();

          const claimed = await tx.all<{ staffID: string }>(sql`
          UPDATE reservation_day_occupancy
          SET
            bits_low = bits_low | ${occupancy.bitsLow},
            bits_high = bits_high | ${occupancy.bitsHigh},
            updated_at = unixepoch()
          WHERE staff_id = ${reservation.staffID}
            AND date = ${reservation.date}
            AND slot_duration_minutes = ${occupancy.slotDurationMinutes}
            AND (bits_low & ${occupancy.bitsLow}) = 0
            AND (bits_high & ${occupancy.bitsHigh}) = 0
          RETURNING staff_id AS staffID
        `);
          if (claimed.length !== 1) {
            return err({ type: "conflict", reason: "slots-occupied" });
          }

          const [inserted] = await tx
            .insert(table.reservation)
            .values({
              ...reservation,
              slotDurationMinutes: occupancy.slotDurationMinutes,
              slotStart: occupancy.slotStart,
              slotCount: occupancy.slotCount,
              occupancyBitsLow: occupancy.bitsLow,
              occupancyBitsHigh: occupancy.bitsHigh,
            })
            .returning();
          await tx.insert(table.reservationOffering).values(
            offeringIDs.map((offeringID, position) => ({
              reservationID: reservation.id,
              offeringID,
              position,
            })),
          );
          return ok(inserted);
        });
      } catch (e) {
        if (this.isDatabaseContention(e) && attempt < maximumAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 25));
          continue;
        }
        logger.error({ err: e, reservationId: reservation.id }, "transactional insert failed");
        return err({ type: "server-error" });
      }
    }
    return err({ type: "server-error" });
  }
}
