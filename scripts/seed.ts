import { createClient } from "@libsql/client";
import { hash } from "argon2";
import { config } from "dotenv";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import * as table from "../src/lib/server/db/schema";

config({ path: ".env" });

const url = process.env.DATABASE_CONNECTION_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

if (!url) {
  throw new Error("DATABASE_CONNECTION_URL is not set");
}

const client = createClient({ url, authToken });
const db = drizzle(client);

const DEFAULT_PASSWORD = "Password123";
const SEED_SLOT_DURATION_MINUTES = 15;

function reservationSlotData(hour: string, durationMinutes: number) {
  const [hours, minutes] = hour.split(":").map(Number);
  const startMinute = hours * 60 + minutes;
  const slotStart = startMinute / SEED_SLOT_DURATION_MINUTES;
  const slotCount = Math.ceil(durationMinutes / SEED_SLOT_DURATION_MINUTES);
  if (!Number.isInteger(slotStart)) throw new Error(`Seed hour ${hour} is not slot-aligned`);

  let occupancyBitsLow = 0n;
  let occupancyBitsHigh = 0n;
  for (let slot = slotStart; slot < slotStart + slotCount; slot++) {
    if (slot < 48) occupancyBitsLow |= 1n << BigInt(slot);
    else occupancyBitsHigh |= 1n << BigInt(slot - 48);
  }

  return {
    startMinute,
    slotDurationMinutes: SEED_SLOT_DURATION_MINUTES,
    slotStart,
    slotCount,
    occupancyBitsLow: Number(occupancyBitsLow),
    occupancyBitsHigh: Number(occupancyBitsHigh),
  };
}

const staffUsers = [
  {
    id: "seed-staff-emilia",
    name: "Emilia Rossi",
    email: "emilia@example.com",
    phoneNumber: "+39 320 111 2233",
  },
  {
    id: "seed-staff-marco",
    name: "Marco Bianchi",
    email: "marco@example.com",
    phoneNumber: "+39 320 444 5566",
  },
];

const customerUsers = [
  {
    id: "seed-customer-luca",
    name: "Luca Verdi",
    email: "luca@example.com",
    phoneNumber: "+39 320 777 8899",
  },
];

const pendingUsers = [
  {
    id: "seed-pending-user-sofia",
    name: "Sofia Galli",
    email: "sofia.pending@example.com",
    phoneNumber: "+39 320 888 1122",
  },
];

const offerings = [
  {
    id: "seed-offering-taglio-base-uomo",
    staffID: "seed-staff-emilia",
    name: "Taglio base uomo",
    duration: 40,
    price: 22,
    description: "Taglio uomo base con rifinitura finale.",
    active: true,
  },
  {
    id: "seed-offering-taglio-scolpitura-barba",
    staffID: "seed-staff-emilia",
    name: "Taglio più scolpitura barba",
    duration: 45,
    price: 25,
    description: "Taglio capelli con scolpitura e rifinitura barba.",
    active: true,
  },
  {
    id: "seed-offering-taglio-donna-piega",
    staffID: "seed-staff-emilia",
    name: "Taglio donna + piega",
    duration: 75,
    price: 60,
    description: "Taglio donna completo con piega finale.",
    active: true,
  },
  {
    id: "seed-offering-solo-sfumatura",
    staffID: "seed-staff-emilia",
    name: "Solo sfumatura",
    duration: 20,
    price: 15,
    description: "Sfumatura laterale o completa con rifinitura.",
    active: true,
  },
  {
    id: "seed-offering-taglio-bambino",
    staffID: "seed-staff-emilia",
    name: "Taglio bambino (0-12)",
    duration: 25,
    price: 18,
    description: "Taglio dedicato ai bambini da 0 a 12 anni.",
    active: true,
  },
  {
    id: "seed-offering-colore-base-tonalizzante-piega",
    staffID: "seed-staff-emilia",
    name: "Colore base + tonalizzante + piega",
    duration: 120,
    price: 90,
    description: "Colore base con tonalizzante e piega finale.",
    active: true,
  },
  {
    id: "seed-offering-colore-base-taglio-piega",
    staffID: "seed-staff-emilia",
    name: "Colore base+ taglio+ piega",
    duration: 120,
    price: 95,
    description: "Colore base con taglio e piega finale.",
    active: true,
  },
  {
    id: "seed-offering-piega",
    staffID: "seed-staff-emilia",
    name: "Piega",
    duration: 40,
    price: 30,
    description: "Piega capelli con styling finale.",
    active: true,
  },
  {
    id: "seed-offering-colore-base-tonalizzante-taglio-piega",
    staffID: "seed-staff-emilia",
    name: "Colore base+ tonalizzante+taglio+piega",
    duration: 150,
    price: 120,
    description: "Colore base con tonalizzante, taglio e piega finale.",
    active: true,
  },
  {
    id: "seed-offering-colore-base-piega",
    staffID: "seed-staff-emilia",
    name: "Colore base + piega",
    duration: 90,
    price: 65,
    description: "Colore base con piega finale.",
    active: true,
  },
  {
    id: "seed-offering-tonalizzante-taglio-piega",
    staffID: "seed-staff-emilia",
    name: "Tonalizzante + taglio + piega",
    duration: 100,
    price: 85,
    description: "Tonalizzante con taglio e piega finale.",
    active: true,
  },
  {
    id: "seed-offering-tonalizzante-piega",
    staffID: "seed-staff-emilia",
    name: "Tonalizzante + piega",
    duration: 90,
    price: 55,
    description: "Tonalizzante con piega finale.",
    active: true,
  },
  {
    id: "seed-offering-skin-fade",
    staffID: "seed-staff-marco",
    name: "Skin Fade",
    duration: 45,
    price: 35,
    description: "Sfumatura a pelle precisa con consulenza sullo styling.",
    active: true,
  },
  {
    id: "seed-offering-hair-beard",
    staffID: "seed-staff-marco",
    name: "Taglio + Barba",
    duration: 60,
    price: 45,
    description: "Servizio completo taglio capelli e cura barba.",
    active: true,
  },
];

const schedules = staffUsers.flatMap((staffUser) =>
  [1, 2, 3, 4, 5].map((day) => ({
    staffID: staffUser.id,
    day,
    startHour: 9,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
  })),
);

const emailVerifications = [
  {
    id: "seed-email-change-valid",
    userID: "seed-customer-luca",
    email: "luca.updated@example.com",
    expiresAt: getDateTimeFromToday(1, 12, 0),
  },
  {
    id: "seed-email-change-expired",
    userID: "seed-customer-luca",
    email: "luca.expired@example.com",
    expiresAt: getDateTimeFromToday(-1, 12, 0),
  },
  {
    id: "seed-email-change-forbidden",
    userID: "seed-staff-emilia",
    email: "emilia.updated@example.com",
    expiresAt: getDateTimeFromToday(1, 12, 0),
  },
];

const passwordRecoveries = [
  {
    id: "seed-password-recover-valid",
    userID: "seed-customer-luca",
    expiresAt: getDateTimeFromToday(1, 12, 0),
  },
  {
    id: "seed-password-recover-expired",
    userID: "seed-customer-luca",
    expiresAt: getDateTimeFromToday(-1, 12, 0),
  },
];

const reservations = [
  {
    id: "seed-reservation-matteo",
    date: getDateFromToday(2),
    hour: "09:00",
    phoneNumber: "+39 320 101 2201",
    offeringIDs: ["seed-offering-solo-sfumatura", "seed-offering-taglio-scolpitura-barba"],
    name: "Matteo Riva",
    email: "matteo.riva@example.com",
    expiresAt: getDateTimeFromToday(2, 9, 0),
    pending: false,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-elena",
    date: getDateFromToday(2),
    hour: "10:15",
    phoneNumber: "+39 320 101 2202",
    offeringIDs: ["seed-offering-taglio-bambino"],
    name: "Elena Bianchi",
    email: "elena.bianchi@example.com",
    expiresAt: getDateTimeFromToday(2, 10, 15),
    pending: false,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-luca",
    date: getDateFromToday(2),
    hour: "10:45",
    phoneNumber: "+39 320 777 8899",
    offeringIDs: ["seed-offering-taglio-base-uomo"],
    name: "Luca Verdi",
    email: "luca@example.com",
    expiresAt: getDateTimeFromToday(2, 10, 45),
    pending: false,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-davide",
    date: getDateFromToday(2),
    hour: "11:30",
    phoneNumber: "+39 320 101 2203",
    offeringIDs: ["seed-offering-taglio-scolpitura-barba"],
    name: "Davide Romano",
    email: "davide.romano@example.com",
    expiresAt: getDateTimeFromToday(2, 11, 30),
    pending: true,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-chiara",
    date: getDateFromToday(2),
    hour: "12:15",
    phoneNumber: "+39 320 101 2204",
    offeringIDs: ["seed-offering-taglio-donna-piega", "seed-offering-tonalizzante-piega"],
    name: "Chiara Fontana",
    email: "chiara.fontana@example.com",
    expiresAt: getDateTimeFromToday(2, 12, 15),
    pending: false,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-simone",
    date: getDateFromToday(2),
    hour: "15:00",
    phoneNumber: "+39 320 101 2205",
    offeringIDs: ["seed-offering-taglio-base-uomo"],
    name: "Simone Greco",
    email: "simone.greco@example.com",
    expiresAt: getDateTimeFromToday(2, 15, 0),
    pending: false,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-martina",
    date: getDateFromToday(2),
    hour: "15:45",
    phoneNumber: "+39 320 101 2206",
    offeringIDs: ["seed-offering-colore-base-piega"],
    name: "Martina Costa",
    email: "martina.costa@example.com",
    expiresAt: getDateTimeFromToday(2, 15, 45),
    pending: false,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-alessio",
    date: getDateFromToday(2),
    hour: "17:15",
    phoneNumber: "+39 320 101 2207",
    offeringIDs: ["seed-offering-taglio-base-uomo"],
    name: "Alessio Moretti",
    email: "alessio.moretti@example.com",
    expiresAt: getDateTimeFromToday(2, 17, 15),
    pending: true,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-sara",
    date: getDateFromToday(3),
    hour: "09:00",
    phoneNumber: "+39 320 101 2208",
    offeringIDs: ["seed-offering-solo-sfumatura"],
    name: "Sara De Luca",
    email: "sara.deluca@example.com",
    expiresAt: getDateTimeFromToday(3, 9, 0),
    pending: false,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-federico",
    date: getDateFromToday(3),
    hour: "09:30",
    phoneNumber: "+39 320 101 2209",
    offeringIDs: ["seed-offering-taglio-scolpitura-barba"],
    name: "Federico Leone",
    email: "federico.leone@example.com",
    expiresAt: getDateTimeFromToday(3, 9, 30),
    pending: false,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-gabriele",
    date: getDateFromToday(3),
    hour: "10:15",
    phoneNumber: "+39 320 101 2210",
    offeringIDs: ["seed-offering-taglio-bambino"],
    name: "Gabriele Sala",
    email: "gabriele.sala@example.com",
    expiresAt: getDateTimeFromToday(3, 10, 15),
    pending: true,
    staffID: "seed-staff-emilia",
  },
  {
    id: "seed-reservation-anna",
    date: getDateFromToday(3),
    hour: "15:30",
    phoneNumber: "+39 320 222 3344",
    offeringIDs: ["seed-offering-hair-beard", "seed-offering-skin-fade"],
    name: "Anna Neri",
    email: "anna@example.com",
    expiresAt: getDateTimeFromNow(10),
    pending: true,
    staffID: "seed-staff-marco",
  },
  {
    id: "seed-reservation-expired-pending",
    date: getDateFromToday(4),
    hour: "11:30",
    phoneNumber: "+39 320 555 6677",
    offeringIDs: ["seed-offering-piega"],
    name: "Giulia Conti",
    email: "giulia@example.com",
    expiresAt: getDateTimeFromToday(-1, 11, 30),
    pending: true,
    staffID: "seed-staff-emilia",
  },
];

async function main() {
  console.info("Seeding database...");

  const passwordHash = await hash(DEFAULT_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  for (const user of [...staffUsers, ...customerUsers]) {
    await db
      .insert(table.user)
      .values({
        ...user,
        email: user.email.toLowerCase(),
        passwordHash,
        verifiedEmail: true,
        expiresAt: null,
      })
      .onConflictDoUpdate({
        target: table.user.id,
        set: {
          name: user.name,
          email: user.email.toLowerCase(),
          phoneNumber: user.phoneNumber,
          passwordHash,
          verifiedEmail: true,
          expiresAt: null,
        },
      });
  }

  for (const user of pendingUsers) {
    await db
      .insert(table.user)
      .values({
        ...user,
        email: user.email.toLowerCase(),
        passwordHash,
        verifiedEmail: false,
        expiresAt: getDateTimeFromToday(1, 12, 0),
      })
      .onConflictDoUpdate({
        target: table.user.id,
        set: {
          name: user.name,
          email: user.email.toLowerCase(),
          phoneNumber: user.phoneNumber,
          passwordHash,
          verifiedEmail: false,
          expiresAt: getDateTimeFromToday(1, 12, 0),
        },
      });
  }

  for (const staffUser of staffUsers) {
    await db
      .insert(table.staff)
      .values({
        userID: staffUser.id,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: table.staff.userID,
        set: { isActive: true },
      });
  }

  for (const service of offerings) {
    await db
      .insert(table.offering)
      .values(service)
      .onConflictDoUpdate({
        target: table.offering.id,
        set: {
          staffID: service.staffID,
          name: service.name,
          duration: service.duration,
          price: service.price,
          description: service.description,
          active: service.active,
        },
      });
  }

  for (const schedule of schedules) {
    const existing = await db
      .select({ id: table.schedule.id })
      .from(table.schedule)
      .where(eq(table.schedule.staffID, schedule.staffID));

    if (existing.length > 0) {
      await db.delete(table.schedule).where(eq(table.schedule.staffID, schedule.staffID));
    }
  }

  if (schedules.length > 0) {
    await db.insert(table.schedule).values(schedules);
  }

  await db
    .insert(table.banner)
    .values({
      id: 1,
      message: "Benvenuto da Emi's Barber Shop! Prenota ora il tuo appuntamento.",
      visible: true,
    })
    .onConflictDoUpdate({
      target: table.banner.id,
      set: {
        message: "Benvenuto da Emi's Barber Shop! Prenota ora il tuo appuntamento.",
        visible: true,
      },
    });

  const reservationIDs = reservations.map(({ id }) => id);
  await db.delete(table.reservation).where(inArray(table.reservation.id, reservationIDs));

  for (const reservation of reservations) {
    const { offeringIDs, ...reservationData } = reservation;
    const durationMinutes = offeringIDs.reduce((total, offeringID) => {
      const offering = offerings.find(({ id }) => id === offeringID);
      if (!offering) throw new Error(`Unknown seed offering ${offeringID}`);
      return total + offering.duration;
    }, 0);
    const slotData = reservationSlotData(reservation.hour, durationMinutes);

    await db.transaction(async (tx) => {
      if (reservation.expiresAt.getTime() > Date.now()) {
        await tx
          .insert(table.reservationDayOccupancy)
          .values({
            staffID: reservation.staffID,
            date: reservation.date,
            slotDurationMinutes: slotData.slotDurationMinutes,
          })
          .onConflictDoNothing();
        const claimed = await tx.all(sql`
          UPDATE reservation_day_occupancy
          SET
            bits_low = bits_low | ${slotData.occupancyBitsLow},
            bits_high = bits_high | ${slotData.occupancyBitsHigh},
            updated_at = unixepoch()
          WHERE staff_id = ${reservation.staffID}
            AND date = ${reservation.date}
            AND (bits_low & ${slotData.occupancyBitsLow}) = 0
            AND (bits_high & ${slotData.occupancyBitsHigh}) = 0
          RETURNING staff_id
        `);
        if (claimed.length !== 1) throw new Error(`Seed reservation ${reservation.id} overlaps`);
      }

      await tx.insert(table.reservation).values({ ...reservationData, ...slotData });

      await tx
        .delete(table.reservationOffering)
        .where(eq(table.reservationOffering.reservationID, reservation.id));
      await tx.insert(table.reservationOffering).values(
        offeringIDs.map((offeringID, position) => ({
          reservationID: reservation.id,
          offeringID,
          position,
        })),
      );
    });
  }

  for (const emailVerification of emailVerifications) {
    await db
      .insert(table.emailVerification)
      .values(emailVerification)
      .onConflictDoUpdate({
        target: table.emailVerification.id,
        set: {
          userID: emailVerification.userID,
          email: emailVerification.email,
          expiresAt: emailVerification.expiresAt,
        },
      });
  }

  for (const passwordRecover of passwordRecoveries) {
    await db
      .insert(table.passwordRecover)
      .values(passwordRecover)
      .onConflictDoUpdate({
        target: table.passwordRecover.id,
        set: {
          userID: passwordRecover.userID,
          expiresAt: passwordRecover.expiresAt,
        },
      });
  }

  console.info("Database seeded successfully.");
  console.info(`Seeded users use password: ${DEFAULT_PASSWORD}`);
  console.info(`
Ephemeral route previews:
  Reservation pending:       /book/pending/seed-reservation-anna
  Reservation expired:       /book/pending/seed-reservation-expired-pending
  Reservation confirmed:     /book/confirm/seed-reservation-luca
  Reservation invalid:       /book/confirm/invalid-token

  Email verification:        /account/verify-email/seed-pending-user-sofia
  Already verified:          /account/verify-email/seed-customer-luca
  Invalid verification:      /account/verify-email/invalid-token

  Password reset:            /account/reset-password/seed-password-recover-valid
  Expired password reset:    /account/reset-password/seed-password-recover-expired
  Invalid password reset:    /account/reset-password/invalid-token

  Email change (login Luca): /account/confirm-email-change/seed-email-change-valid
  Expired email change:      /account/confirm-email-change/seed-email-change-expired
  Forbidden email change:    /account/confirm-email-change/seed-email-change-forbidden
  Unauthorized email change: /account/confirm-email-change/seed-email-change-valid

Some successful routes mutate or consume their fixture. Run pnpm db:seed again to reset them.
`);
}

function getDateFromToday(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function getDateTimeFromNow(minutesFromNow: number) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}

function getDateTimeFromToday(daysFromToday: number, hours: number, minutes: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

main()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    client.close();
  });
