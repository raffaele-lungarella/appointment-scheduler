import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phoneNumber: text("phone_number"),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    verifiedEmail: integer("verified_email", { mode: "boolean" }).notNull().default(false),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (entry) => [index("user_expires_at_idx").on(entry.expiresAt)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userID: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ...timestamps,
  },
  (entry) => [index("session_expires_at_idx").on(entry.expiresAt)],
);

export const reservation = sqliteTable(
  "reservation",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    // Legacy compatibility column; remove after all environments use start_minute.
    hour: text("hour").notNull(),
    startMinute: integer("start_minute").notNull().default(0),
    phoneNumber: text("phone_number"),

    name: text("name").notNull(),
    email: text("email").notNull(),
    ownerUserID: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    pending: integer("pending", { mode: "boolean" }).notNull().default(false),
    slotDurationMinutes: integer("slot_duration_minutes").notNull().default(15),
    slotStart: integer("slot_start").notNull().default(0),
    slotCount: integer("slot_count").notNull().default(1),
    occupancyBitsLow: integer("occupancy_bits_low").notNull().default(0),
    occupancyBitsHigh: integer("occupancy_bits_high").notNull().default(0),
    staffID: text("staff_id")
      .notNull()
      .references(() => staff.userID, { onDelete: "restrict" }),
    ...timestamps,
  },
  (entry) => [
    index("reservation_owner_user_idx").on(entry.ownerUserID),
    index("reservation_availability_idx").on(entry.staffID, entry.date, entry.startMinute),
    index("reservation_expires_at_idx").on(entry.expiresAt),
    index("reservation_pending_idx").on(entry.pending),
    check("reservation_start_minute_check", sql`${entry.startMinute} BETWEEN 0 AND 1439`),
    check(
      "reservation_slot_duration_check",
      sql`${entry.slotDurationMinutes} >= 15 AND 1440 % ${entry.slotDurationMinutes} = 0`,
    ),
    check("reservation_slot_start_check", sql`${entry.slotStart} BETWEEN 0 AND 95`),
    check("reservation_slot_count_check", sql`${entry.slotCount} > 0`),
    check(
      "reservation_slot_range_check",
      sql`${entry.slotStart} + ${entry.slotCount} <= 1440 / ${entry.slotDurationMinutes}`,
    ),
    check("reservation_occupancy_bits_low_check", sql`${entry.occupancyBitsLow} >= 0`),
    check("reservation_occupancy_bits_high_check", sql`${entry.occupancyBitsHigh} >= 0`),
  ],
);

export const reservationSlotPolicy = sqliteTable(
  "reservation_slot_policy",
  {
    effectiveFromDate: text("effective_from_date").primaryKey(),
    slotDurationMinutes: integer("slot_duration_minutes").notNull(),
    ...timestamps,
  },
  (policy) => [
    check(
      "reservation_slot_policy_duration_check",
      sql`${policy.slotDurationMinutes} >= 15 AND 1440 % ${policy.slotDurationMinutes} = 0`,
    ),
  ],
);

export const reservationDayOccupancy = sqliteTable(
  "reservation_day_occupancy",
  {
    staffID: text("staff_id")
      .notNull()
      .references(() => staff.userID, { onDelete: "cascade" }),
    date: text("date").notNull(),
    slotDurationMinutes: integer("slot_duration_minutes").notNull(),
    bitsLow: integer("bits_low").notNull().default(0),
    bitsHigh: integer("bits_high").notNull().default(0),
    ...timestamps,
  },
  (occupancy) => [
    primaryKey({ columns: [occupancy.staffID, occupancy.date] }),
    check(
      "reservation_day_occupancy_duration_check",
      sql`${occupancy.slotDurationMinutes} >= 15 AND 1440 % ${occupancy.slotDurationMinutes} = 0`,
    ),
    check("reservation_day_occupancy_bits_low_check", sql`${occupancy.bitsLow} >= 0`),
    check("reservation_day_occupancy_bits_high_check", sql`${occupancy.bitsHigh} >= 0`),
  ],
);

export const offering = sqliteTable(
  "offering",
  {
    id: text("id").primaryKey(),
    staffID: text("staff_id")
      .notNull()
      .references(() => staff.userID, { onDelete: "cascade" }),
    name: text("name").notNull(),
    duration: integer("duration").notNull(),
    price: integer("price").notNull(),
    description: text("description"),
    active: integer("active", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (entry) => [
    check("offering_duration_positive_check", sql`${entry.duration} > 0`),
    check("offering_price_nonnegative_check", sql`${entry.price} >= 0`),
    index("offering_staff_active_idx").on(entry.staffID, entry.active),
  ],
);

export const reservationOffering = sqliteTable(
  "reservation_offering",
  {
    reservationID: text("reservation_id")
      .notNull()
      .references(() => reservation.id, { onDelete: "cascade" }),
    offeringID: text("offering_id")
      .notNull()
      .references(() => offering.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (entry) => [
    primaryKey({ columns: [entry.reservationID, entry.offeringID] }),
    index("reservation_offering_reservation_idx").on(entry.reservationID),
    index("reservation_offering_offering_idx").on(entry.offeringID),
  ],
);

export const banner = sqliteTable("banner", {
  id: integer().primaryKey().default(1),
  message: text("message"),
  visible: integer("visible", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

// was closures
export const shutdowns = sqliteTable(
  "shutdown",
  {
    id: text("id").primaryKey(),
    staffID: text("staff_id")
      .notNull()
      .references(() => staff.userID, { onDelete: "cascade" }),
    start: text("start").notNull(),
    end: text("end").notNull(),
    ...timestamps,
  },
  (entry) => [
    check("shutdown_range_check", sql`${entry.start} <= ${entry.end}`),
    index("shutdown_staff_range_idx").on(entry.staffID, entry.start, entry.end),
  ],
);

export const emailVerification = sqliteTable("email_verification", {
  id: text("id").primaryKey(),
  userID: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  email: text("email").notNull(),
  ...timestamps,
});

export const passwordRecover = sqliteTable("password_recover", {
  id: text("id").primaryKey(),
  userID: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  ...timestamps,
});

export const rateLimit = sqliteTable(
  "rate_limit",
  {
    keyHash: text("key_hash").notNull(),
    windowStart: integer("window_start", { mode: "timestamp" }).notNull(),
    requestCount: integer("request_count").notNull().default(1),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (entry) => [
    primaryKey({ columns: [entry.keyHash, entry.windowStart] }),
    index("rate_limit_expires_at_idx").on(entry.expiresAt),
    check("rate_limit_request_count_positive_check", sql`${entry.requestCount} > 0`),
  ],
);

export const publicToken = sqliteTable(
  "public_token",
  {
    tokenHash: text("token_hash").primaryKey(),
    purpose: text("purpose", {
      enum: [
        "reservation_access",
        "reservation_confirmation",
        "account_verification",
        "password_reset",
        "email_change",
      ],
    }).notNull(),
    userID: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    reservationID: text("reservation_id").references(() => reservation.id, {
      onDelete: "cascade",
    }),
    pendingEmail: text("pending_email"),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    consumedAt: integer("consumed_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (token) => [
    index("public_token_user_purpose_idx").on(token.userID, token.purpose),
    index("public_token_reservation_purpose_idx").on(token.reservationID, token.purpose),
    index("public_token_expires_at_idx").on(token.expiresAt),
  ],
);

export const schedule = sqliteTable(
  "schedule",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    staffID: text("staff_id")
      .notNull()
      .references(() => staff.userID, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    startHour: integer("start_hour").notNull(),
    startMinute: integer("start_minute").notNull().default(0),
    endHour: integer("end_hour").notNull(),
    endMinute: integer("end_minute").notNull().default(0),
    ...timestamps,
  },
  (entry) => [
    check("schedule_day_check", sql`${entry.day} BETWEEN 0 AND 6`),
    check(
      "schedule_hours_check",
      sql`${entry.startHour} BETWEEN 0 AND 23 AND ${entry.endHour} BETWEEN 0 AND 23`,
    ),
    check(
      "schedule_minutes_check",
      sql`${entry.startMinute} BETWEEN 0 AND 59 AND ${entry.endMinute} BETWEEN 0 AND 59`,
    ),
    check(
      "schedule_range_check",
      sql`${entry.startHour} * 60 + ${entry.startMinute} < ${entry.endHour} * 60 + ${entry.endMinute}`,
    ),
    index("schedule_staff_day_idx").on(entry.staffID, entry.day),
  ],
);

export const staff = sqliteTable("staff", {
  userID: text("user_id")
    .primaryKey()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  avatar: text("avatar"),
  avatarOriginal: text("avatar_original"),
  avatarOffsetX: real("avatar_offset_x"),
  avatarOffsetY: real("avatar_offset_y"),
  avatarDisplayScale: real("avatar_display_scale"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export type SessionRow = typeof session.$inferSelect;
export type NewSessionRow = typeof session.$inferInsert;
export type UserRow = typeof user.$inferSelect;
export type StaffRow = typeof staff.$inferSelect;
export type ReservationRow = typeof reservation.$inferSelect;
export type ReservationSlotPolicyRow = typeof reservationSlotPolicy.$inferSelect;
export type ReservationDayOccupancyRow = typeof reservationDayOccupancy.$inferSelect;
export type ReservationOfferingRow = typeof reservationOffering.$inferSelect;
export type OfferingRow = typeof offering.$inferSelect;
export type NewOfferingRow = typeof offering.$inferInsert;
export type BannerRow = typeof banner.$inferSelect;
export type ShutdownRow = typeof shutdowns.$inferSelect;
export type EmailVerificationTokenRow = typeof emailVerification.$inferSelect;
export type PasswordRecoverRow = typeof passwordRecover.$inferSelect;
export type PublicTokenRow = typeof publicToken.$inferSelect;
export type RateLimitRow = typeof rateLimit.$inferSelect;
export type ScheduleRow = typeof schedule.$inferSelect;
export type NewScheduleRow = Omit<typeof schedule.$inferInsert, "id">;
