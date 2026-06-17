import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	phoneNumber: text("phone_number"),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	verifiedEmail: integer("verified_email", { mode: "boolean" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
});

export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	userID: text("user_id")
		.notNull()
		.references(() => user.id),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const reservation = sqliteTable(
	"reservation",
	{
		id: text("id").primaryKey(),
		date: text("date").notNull(),
		hour: text("hour").notNull(),
		phoneNumber: text("phone_number"),
		kindID: text("kind_id")
			.notNull()
			.references(() => kind.id),
		name: text("name").notNull(),
		email: text("email").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
		pending: integer({ mode: "boolean" }).notNull(),
		staffID: text("staff_id")
			.notNull()
			.references(() => staff.userID),
	},
	(table) => [
		uniqueIndex("reservation_date_hour_staff_unique").on(table.date, table.hour, table.staffID),
	],
);

export const kind = sqliteTable("kind", {
	id: text("id").primaryKey(),
	staffID: text("staff_id")
		.notNull()
		.references(() => staff.userID),
	name: text("name").notNull(),
	duration: integer("duration").notNull(),
	price: integer("price").notNull(),
	description: text("description"),
	active: integer({ mode: "boolean" }).notNull(),
});

export const banner = sqliteTable("banner", {
	id: integer().primaryKey().default(1),
	message: text("message"),
	visible: integer({ mode: "boolean" }),
});

// was closures
export const shutdowns = sqliteTable("shutdown", {
	id: text("id").primaryKey(),
	staffID: text("staff_id")
		.notNull()
		.references(() => staff.userID),
	start: text("start").notNull(),
	end: text("end").notNull(),
});

export const emailVerification = sqliteTable("email_verification", {
	id: text("id").primaryKey(),
	userID: text("user_id")
		.notNull()
		.references(() => user.id),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
	email: text("email").notNull(),
});

export const passwordRecover = sqliteTable("password_recover", {
	id: text("id").primaryKey(),
	userID: text("user_id")
		.notNull()
		.references(() => user.id),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
});

export const schedule = sqliteTable("schedule", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	staffID: text("staff_id")
		.notNull()
		.references(() => staff.userID),
	day: integer("day").notNull(),
	startHour: integer("start_hour").notNull(),
	startMinute: integer("start_minute").notNull().default(0),
	endHour: integer("end_hour").notNull(),
	endMinute: integer("end_minute").notNull().default(0),
});

export const staff = sqliteTable("staff", {
	userID: text("user_id")
		.primaryKey()
		.notNull()
		.references(() => user.id),
	avatar: text("avatar"),
	isActive: integer("is_active", { mode: "boolean" }).default(false),
});

export type DBSession = typeof session.$inferSelect;
export type DBUser = typeof user.$inferSelect;
export type DBStaff = typeof staff.$inferSelect;
export type DBReservation = typeof reservation.$inferSelect;
export type DBKind = typeof kind.$inferSelect;
export type DBBanner = typeof banner.$inferSelect;
export type DBShutdown = typeof shutdowns.$inferSelect;
export type DBEmailVerificationToken = typeof emailVerification.$inferSelect;
export type DBPasswordRecover = typeof passwordRecover.$inferSelect;
export type DBSchedule = typeof schedule.$inferSelect;
export type Schedule = Omit<typeof schedule.$inferSelect, "id">;
