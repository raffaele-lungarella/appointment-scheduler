import type { DateValue, Time } from "@internationalized/date";
import type {
	DBBanner,
	DBShutdown,
	DBReservation,
	DBKind,
	DBSession,
	DBUser,
	DBStaff,
} from "../server/db/schema";
import type { Day } from "$lib/enums/days";

export type { DBBanner, DBShutdown, DBReservation, DBKind, DBSession, DBUser };

export type Reservation = {
	id: string;
	date: string;
	hour: string;
	name: string;
	email: string;
	pending: boolean;
	expiresAt: Date;
	staff: {
		id: string;
		name: string;
	};
	kind: {
		duration: number;
		name: string;
		price: number;
	};
	user: {
		id: string;
		name: string;
		email: string;
	} | null;
};

export type User =
	| {
			role: "user";
			data: DBUser;
	  }
	| {
			role: "staff";
			data: DBUser & DBStaff;
	  };

export type Staff = {
	name: string;
	id: string;
	avatar: string | null;
};

export type Data = AnonymousData | UsualData | StaffData;
export type AnonymousData = {
	who: "anonymous";
	name: string;
	email: string;
	date: string;
	hour: string;
	kind: string;
	staff: string;
	phone?: string;
};

export type UsualData = {
	who: "usual";
	date: string;
	hour: string;
	kind: string;
	staff: string;
};

export type StaffData = {
	who: "staff";
	name?: string;
	phone?: string;
	date: string;
	hour: string;
	kind: string;
	staff: string;
};

export type UserSession = { user: User; session: DBSession };

export type ScheduleRange = {
	start: Time;
	end: Time;
	id?: number;
};
export type ScheduleUI = Map<Day, ScheduleRange[]>;

// You can also add client-specific utility types here
export type UserWithoutPassword = Omit<DBUser, "passwordHash">;
export type KindSummary = Pick<DBKind, "id" | "name" | "price" | "duration">;
export type BusinessHours = {
	start: Time;
	end: Time;
};
export type ReservedSlot = {
	date: DateValue;
	start: Time;
	duration: Time;
};
export type Slot = {
	start: Time;
	available: boolean;
	invalid: boolean;
	past: boolean;
};

export type Tab = "date" | "kind" | "info";
