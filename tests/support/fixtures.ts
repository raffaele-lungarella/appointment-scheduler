import type { Database } from "$lib/server/db/client";
import * as table from "$lib/server/db/schema";

type StaffFixture = {
  id?: string;
  name?: string;
  email?: string;
};

export async function seedUser(
  database: Database,
  {
    id = "user-1",
    name = "Test User",
    email = "user@example.com",
  }: { id?: string; name?: string; email?: string } = {},
) {
  await database.insert(table.user).values({
    id,
    name,
    email,
    passwordHash: "not-used-in-tests",
  });

  return { id, name, email };
}

export async function seedStaff(
  database: Database,
  { id = "staff-1", name = "Test Barber", email = "barber@example.com" }: StaffFixture = {},
) {
  await seedUser(database, { id, name, email });
  await database.insert(table.staff).values({ userID: id });

  return { id, name, email };
}

export async function seedOffering(
  database: Database,
  {
    id = "offering-1",
    staffID = "staff-1",
    name = "Haircut",
    duration = 30,
    price = 2_000,
    active = true,
  }: {
    id?: string;
    staffID?: string;
    name?: string;
    duration?: number;
    price?: number;
    active?: boolean;
  } = {},
) {
  await database.insert(table.offering).values({
    id,
    staffID,
    name,
    duration,
    price,
    active,
  });

  return { id, staffID, name, duration, price, active };
}
