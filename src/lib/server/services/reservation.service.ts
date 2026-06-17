import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { logger } from "../logger";
import { err, ok, type Result } from "$lib/modules/result";
import { LOCK_DURATION } from "$lib/constants";
import type { AnonymousData, DBUser, Reservation, StaffData, UsualData } from "@types";
import { anonymousUserSchema, staffUserSchema, usualUserSchema } from "@schema";
import { alias } from "drizzle-orm/sqlite-core/alias";
import { Service } from "./service";
import { parseTime } from "@internationalized/date";
import { minutesToTime } from "$lib/utils";
import { hasReservationConflict } from "$lib/modules/reservation-overlap";

type InsertError = "conflict" | "invalid-data" | "server-err";

export class ReservationService extends Service {
	private getReservations() {
		const staffUser = alias(table.user, "staffUser");
		const customerUser = alias(table.user, "customerUser");

		return db
			.select({
				id: table.reservation.id,
				date: table.reservation.date,
				hour: table.reservation.hour,
				name: table.reservation.name,
				email: table.reservation.email,
				pending: table.reservation.pending,
				expiresAt: table.reservation.expiresAt,
				staff: {
					id: staffUser.id,
					name: staffUser.name,
				},
				kind: {
					duration: table.kind.duration,
					name: table.kind.name,
					price: table.kind.price,
				},
				user: {
					name: customerUser.name,
					email: customerUser.email,
					id: customerUser.id,
				},
			})
			.from(table.reservation)
			.innerJoin(table.kind, eq(table.reservation.kindID, table.kind.id))
			.innerJoin(table.staff, eq(table.reservation.staffID, table.staff.userID))
			.innerJoin(staffUser, eq(table.staff.userID, staffUser.id))
			.leftJoin(customerUser, eq(table.reservation.email, customerUser.email));
	}

	async insertByUser(data: UsualData, user: DBUser): Promise<Result<Reservation, InsertError>> {
		try {
			const schema = usualUserSchema.safeParse({ ...data, date: data.date?.toString() });

			if (!schema.success) {
				logger.error(schema.error.issues);
				return err("invalid-data");
			}

			const { date, hour, kind, staff } = schema.data;

			const expiresAt = new Date(date);
			expiresAt.setDate(expiresAt.getDate() + 1);
			expiresAt.setHours(23, 59, 59, 999);

			const reservation: table.DBReservation = {
				date,
				hour,
				id: crypto.randomUUID(),
				kindID: kind,
				name: user.name,
				phoneNumber: user.phoneNumber,
				email: user.email,
				pending: false,
				expiresAt,
				staffID: staff,
			};

			const queryRes = await this.insertWithAvailabilityCheck(reservation);

			if (queryRes.isErr()) {
				logger.error("Could not insert reservation");
				return err(queryRes.error);
			}

			const fullReservation = await this.getByID(queryRes.unwrap().id);
			if (!fullReservation) {
				logger.error("Could not fetch inserted reservation");
				return err("server-err");
			}

			return ok(fullReservation);
		} catch (e) {
			logger.error({ e }, "Error while adding usual user");
			return err("server-err");
		}
	}

	async insertByAnonymous(data: AnonymousData): Promise<Result<Reservation, InsertError>> {
		try {
			const schema = anonymousUserSchema.safeParse({
				name: data.name,
				email: data.email.toLowerCase().trim(),
				date: data.date?.toString(),
				hour: data.hour,
				kind: data.kind,
				staff: data.staff,
			});

			if (!schema.success) {
				const { path } = schema.error.issues[0];
				logger.warn({ reason: path }, "Could not create reservation");
				return err("invalid-data");
			}

			const reservation: table.DBReservation = {
				date: schema.data.date,
				hour: schema.data.hour,
				id: crypto.randomUUID(),
				kindID: schema.data.kind,
				name: schema.data.name,
				phoneNumber: schema.data.phone ?? null,
				email: schema.data.email,
				expiresAt: new Date(Date.now() + LOCK_DURATION),
				pending: true,
				staffID: schema.data.staff,
			};

			const queryRes = await this.insertWithAvailabilityCheck(reservation);

			if (queryRes.isErr()) {
				logger.error("Could not insert reservation");
				return err(queryRes.error);
			}

			const fullReservation = await this.getByID(queryRes.unwrap().id);
			if (!fullReservation) {
				logger.error("Could not fetch inserted reservation");
				return err("server-err");
			}

			return ok(fullReservation);
		} catch (e) {
			logger.error(e);
			return err("server-err");
		}
	}

	async insertByStaff(
		data: StaffData,
		user: DBUser,
		alternativeName?: string,
	): Promise<Result<Reservation, InsertError>> {
		try {
			const schema = staffUserSchema.safeParse({
				...data,
				name: alternativeName ?? "Inserito da staff",
				date: data.date?.toString(),
			});

			if (!schema.success) {
				logger.error(schema.error.issues);
				return err("invalid-data");
			}

			const { date, hour, kind, staff, name } = schema.data;

			const expiresAt = new Date(date);
			expiresAt.setDate(expiresAt.getDate() + 1); // Add one day
			expiresAt.setHours(23, 59, 59, 999); // Set to end of the day

			const reservation: table.DBReservation = {
				date,
				hour,
				id: crypto.randomUUID(),
				kindID: kind,
				name,
				email: user.email,
				pending: false,
				expiresAt,
				staffID: staff,
				phoneNumber: null,
			};

			const queryRes = await this.insertWithAvailabilityCheck(reservation);

			if (queryRes.isErr()) {
				logger.error("Could not insert reservation");
				return err(queryRes.error);
			}

			const fullReservation = await this.getByID(queryRes.unwrap().id);
			if (!fullReservation) {
				logger.error("Could not fetch inserted reservation");
				return err("server-err");
			}

			return ok(fullReservation);
		} catch (e) {
			logger.error({ e }, "Error while adding usual user");
			return err("server-err");
		}
	}

	async getAll(): Promise<Reservation[] | null> {
		try {
			return await this.getReservations().where(gt(table.reservation.expiresAt, new Date()));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async getTodayReservations(date: string, staffID: string): Promise<Reservation[] | null> {
		try {
			return await this.getReservations().where(
				and(
					and(eq(table.reservation.date, date), eq(table.reservation.pending, false)),
					eq(table.staff.userID, staffID),
				),
			);
		} catch (err) {
			console.error(err);
			return null;
		}
	}

	async getByUser(email: string): Promise<Reservation[] | null> {
		try {
			return await this.getReservations().where(
				eq(table.reservation.email, email.toLowerCase().trim()),
			);
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async getByID(id: string): Promise<Reservation | null> {
		try {
			return (await this.getReservations().where(eq(table.reservation.id, id)).get()) ?? null;
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async delete(id: string) {
		try {
			return await db
				.delete(table.reservation)
				.where(eq(table.reservation.id, id))
				.returning();
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async deleteAll(email: string) {
		try {
			return await db
				.delete(table.reservation)
				.where(eq(table.reservation.email, email.toLowerCase().trim()));
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	async deleteAllExpired() {
		try {
			return await db
				.delete(table.reservation)
				.where(lt(table.reservation.expiresAt, new Date()));
		} catch (err) {
			logger.error("Error while removing expired reservations");
			console.error(err);
		}
	}

	/**
	 * Updates the reservation to expire after the day of the reservation
	 */
	async updateExpiration(id: string): Promise<Reservation | null> {
		try {
			const updated = await db
				.update(table.reservation)
				.set({
					pending: false,
					expiresAt: sql`strftime('%s', datetime(${table.reservation.date}, '+1 day'))`,
				})
				.where(eq(table.reservation.id, id))
				.returning()
				.get();

			const fullReservation = await this.getByID(updated.id);
			if (!fullReservation) {
				logger.error("Could not fetch inserted reservation");
				return null;
			}
			return fullReservation;
		} catch (e) {
			logger.error(e);
			return null;
		}
	}

	/**
	 * Inserts a reservation after checking availability within a transaction.
	 */
	private async insertWithAvailabilityCheck(
		reservation: table.DBReservation,
	): Promise<Result<table.DBReservation, InsertError>> {
		try {
			return ok(
				await db.transaction(async (tx) => {
					await tx
						.delete(table.reservation)
						.where(lt(table.reservation.expiresAt, new Date()));

					const reservationKind = await tx
						.select({ duration: table.kind.duration })
						.from(table.kind)
						.where(eq(table.kind.id, reservation.kindID))
						.get();

					if (!reservationKind) {
						throw new Error("INVALID_DATA");
					}

					const existing = await tx
						.select({ hour: table.reservation.hour, duration: table.kind.duration })
						.from(table.reservation)
						.innerJoin(table.kind, eq(table.reservation.kindID, table.kind.id))
						.where(
							and(
								eq(table.reservation.date, reservation.date),
								eq(table.reservation.staffID, reservation.staffID),
								gt(table.reservation.expiresAt, new Date()),
							),
						);

					const conflict = hasReservationConflict(
						{
							start: parseTime(reservation.hour),
							duration: minutesToTime(reservationKind.duration),
						},
						existing.map((entry) => ({
							start: parseTime(entry.hour),
							duration: minutesToTime(entry.duration),
						})),
					);

					if (conflict) {
						throw new Error("CONFLICT");
					}

					const result = await tx
						.insert(table.reservation)
						.values(reservation)
						.returning();
					return result[0] ?? result;
				}),
			);
		} catch (e) {
			const message = (e as Error).message;
			if (message === "CONFLICT" || message.includes("UNIQUE constraint failed")) {
				return err("conflict");
			}

			if (message === "INVALID_DATA") {
				return err("invalid-data");
			}

			return err("server-err");
		}
	}

	async countExpired() {
		try {
			const entries = await db
				.select({ count: count() })
				.from(table.reservation)
				.where(lt(table.reservation.expiresAt, new Date()))
				.get();

			return entries?.count;
		} catch (e) {
			logger.error(e);
			return null;
		}
	}
}
