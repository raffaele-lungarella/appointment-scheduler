PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_kind` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`name` text NOT NULL,
	`duration` integer NOT NULL,
	`price` integer NOT NULL,
	`description` text,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "kind_duration_positive_check" CHECK("__new_kind"."duration" > 0),
	CONSTRAINT "kind_price_nonnegative_check" CHECK("__new_kind"."price" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_kind`("id", "staff_id", "name", "duration", "price", "description", "active", "created_at", "updated_at") SELECT "id", "staff_id", "name", "duration", "price", "description", "active", "created_at", "updated_at" FROM `kind`;--> statement-breakpoint
DROP TABLE `kind`;--> statement-breakpoint
ALTER TABLE `__new_kind` RENAME TO `kind`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `kind_staff_active_idx` ON `kind` (`staff_id`,`active`);--> statement-breakpoint
CREATE INDEX `reservation_availability_idx` ON `reservation` (`staff_id`,`date`,`hour`);--> statement-breakpoint
CREATE INDEX `reservation_expires_at_idx` ON `reservation` (`expires_at`);--> statement-breakpoint
CREATE INDEX `reservation_pending_idx` ON `reservation` (`pending`);--> statement-breakpoint
CREATE TABLE `__new_schedule` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_id` text NOT NULL,
	`day` integer NOT NULL,
	`start_hour` integer NOT NULL,
	`start_minute` integer DEFAULT 0 NOT NULL,
	`end_hour` integer NOT NULL,
	`end_minute` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "schedule_day_check" CHECK("__new_schedule"."day" BETWEEN 0 AND 6),
	CONSTRAINT "schedule_hours_check" CHECK("__new_schedule"."start_hour" BETWEEN 0 AND 23 AND "__new_schedule"."end_hour" BETWEEN 0 AND 23),
	CONSTRAINT "schedule_minutes_check" CHECK("__new_schedule"."start_minute" BETWEEN 0 AND 59 AND "__new_schedule"."end_minute" BETWEEN 0 AND 59),
	CONSTRAINT "schedule_range_check" CHECK("__new_schedule"."start_hour" * 60 + "__new_schedule"."start_minute" < "__new_schedule"."end_hour" * 60 + "__new_schedule"."end_minute")
);
--> statement-breakpoint
INSERT INTO `__new_schedule`("id", "staff_id", "day", "start_hour", "start_minute", "end_hour", "end_minute", "created_at", "updated_at") SELECT "id", "staff_id", "day", "start_hour", "start_minute", "end_hour", "end_minute", "created_at", "updated_at" FROM `schedule`;--> statement-breakpoint
DROP TABLE `schedule`;--> statement-breakpoint
ALTER TABLE `__new_schedule` RENAME TO `schedule`;--> statement-breakpoint
CREATE INDEX `schedule_staff_day_idx` ON `schedule` (`staff_id`,`day`);--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expires_at`);--> statement-breakpoint
CREATE TABLE `__new_shutdown` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "shutdown_range_check" CHECK("__new_shutdown"."start" <= "__new_shutdown"."end")
);
--> statement-breakpoint
INSERT INTO `__new_shutdown`("id", "staff_id", "start", "end", "created_at", "updated_at") SELECT "id", "staff_id", "start", "end", "created_at", "updated_at" FROM `shutdown`;--> statement-breakpoint
DROP TABLE `shutdown`;--> statement-breakpoint
ALTER TABLE `__new_shutdown` RENAME TO `shutdown`;--> statement-breakpoint
CREATE INDEX `shutdown_staff_range_idx` ON `shutdown` (`staff_id`,`start`,`end`);--> statement-breakpoint
CREATE INDEX `user_expires_at_idx` ON `user` (`expires_at`);