ALTER TABLE `reservation` ADD `start_minute` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `reservation`
SET `start_minute` =
  CAST(substr(`hour`, 1, 2) AS integer) * 60
  + CAST(substr(`hour`, 4, 2) AS integer);
--> statement-breakpoint
DROP INDEX `reservation_availability_idx`;
--> statement-breakpoint
CREATE INDEX `reservation_availability_idx`
ON `reservation` (`staff_id`, `date`, `start_minute`);
