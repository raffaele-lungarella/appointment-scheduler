PRAGMA foreign_keys=OFF;
--> statement-breakpoint
ALTER TABLE `kind` RENAME TO `offering`;
--> statement-breakpoint
DROP INDEX `kind_staff_active_idx`;
--> statement-breakpoint
CREATE TABLE `__new_offering` (
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
	CONSTRAINT "offering_duration_positive_check" CHECK("duration" > 0),
	CONSTRAINT "offering_price_nonnegative_check" CHECK("price" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_offering`("id", "staff_id", "name", "duration", "price", "description", "active", "created_at", "updated_at")
SELECT "id", "staff_id", "name", "duration", "price", "description", "active", "created_at", "updated_at" FROM `offering`;
--> statement-breakpoint
DROP TABLE `offering`;
--> statement-breakpoint
ALTER TABLE `__new_offering` RENAME TO `offering`;
--> statement-breakpoint
CREATE INDEX `offering_staff_active_idx` ON `offering` (`staff_id`,`active`);
--> statement-breakpoint
CREATE TABLE `reservation_offering` (
	`reservation_id` text NOT NULL,
	`offering_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`reservation_id`, `offering_id`),
	FOREIGN KEY (`reservation_id`) REFERENCES `reservation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`offering_id`) REFERENCES `offering`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `reservation_offering` (`reservation_id`, `offering_id`, `position`)
SELECT `reservation_id`, `kind_id`, `position` FROM `reservation_kind`;
--> statement-breakpoint
DROP TABLE `reservation_kind`;
--> statement-breakpoint
CREATE INDEX `reservation_offering_reservation_idx` ON `reservation_offering` (`reservation_id`);
--> statement-breakpoint
CREATE INDEX `reservation_offering_offering_idx` ON `reservation_offering` (`offering_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
