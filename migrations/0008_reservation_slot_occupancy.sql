CREATE TABLE `reservation_slot_policy` (
  `effective_from_date` text PRIMARY KEY NOT NULL,
  `slot_duration_minutes` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CONSTRAINT `reservation_slot_policy_duration_check`
    CHECK (`slot_duration_minutes` >= 15 AND 1440 % `slot_duration_minutes` = 0)
);
--> statement-breakpoint
INSERT INTO `reservation_slot_policy`
  (`effective_from_date`, `slot_duration_minutes`, `created_at`, `updated_at`)
VALUES ('0001-01-01', 15, unixepoch(), unixepoch());
--> statement-breakpoint
CREATE TABLE `reservation_day_occupancy` (
  `staff_id` text NOT NULL,
  `date` text NOT NULL,
  `slot_duration_minutes` integer NOT NULL,
  `bits_low` integer DEFAULT 0 NOT NULL,
  `bits_high` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`staff_id`, `date`),
  FOREIGN KEY (`staff_id`) REFERENCES `staff` (`user_id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `reservation_day_occupancy_duration_check`
    CHECK (`slot_duration_minutes` >= 15 AND 1440 % `slot_duration_minutes` = 0),
  CONSTRAINT `reservation_day_occupancy_bits_low_check` CHECK (`bits_low` >= 0),
  CONSTRAINT `reservation_day_occupancy_bits_high_check` CHECK (`bits_high` >= 0)
);
--> statement-breakpoint
ALTER TABLE `reservation` ADD `slot_duration_minutes` integer DEFAULT 15 NOT NULL;
--> statement-breakpoint
ALTER TABLE `reservation` ADD `slot_start` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `reservation` ADD `slot_count` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `reservation` ADD `occupancy_bits_low` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `reservation` ADD `occupancy_bits_high` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TEMP TABLE `_reservation_slot_alignment_audit` (
  `valid` integer NOT NULL CHECK (`valid` = 1)
);
--> statement-breakpoint
INSERT INTO `_reservation_slot_alignment_audit` (`valid`)
SELECT CASE
  WHEN
    (CAST(substr(`reservation`.`hour`, 1, 2) AS integer) * 60
      + CAST(substr(`reservation`.`hour`, 4, 2) AS integer)) % 15 = 0
    AND COALESCE(SUM(`offering`.`duration`), 0) > 0
  THEN 1 ELSE 0
END
FROM `reservation`
LEFT JOIN `reservation_offering`
  ON `reservation_offering`.`reservation_id` = `reservation`.`id`
LEFT JOIN `offering` ON `offering`.`id` = `reservation_offering`.`offering_id`
GROUP BY `reservation`.`id`;
--> statement-breakpoint
DROP TABLE `_reservation_slot_alignment_audit`;
--> statement-breakpoint
UPDATE `reservation`
SET
  `slot_start` =
    (CAST(substr(`hour`, 1, 2) AS integer) * 60 + CAST(substr(`hour`, 4, 2) AS integer)) / 15,
  `slot_count` = (
    SELECT (SUM(`offering`.`duration`) + 14) / 15
    FROM `reservation_offering`
    INNER JOIN `offering` ON `offering`.`id` = `reservation_offering`.`offering_id`
    WHERE `reservation_offering`.`reservation_id` = `reservation`.`id`
  );
--> statement-breakpoint
UPDATE `reservation`
SET
  `occupancy_bits_low` = CASE
    WHEN `slot_start` < 48 THEN
      ((1 << MIN(`slot_count`, 48 - `slot_start`)) - 1) << `slot_start`
    ELSE 0
  END,
  `occupancy_bits_high` = CASE
    WHEN `slot_start` + `slot_count` > 48 THEN
      ((1 << (`slot_start` + `slot_count` - MAX(`slot_start`, 48))) - 1)
        << (MAX(`slot_start`, 48) - 48)
    ELSE 0
  END;
--> statement-breakpoint
CREATE TEMP TABLE `_active_reservation_slot_audit` (
  `staff_id` text NOT NULL,
  `date` text NOT NULL,
  `slot` integer NOT NULL,
  PRIMARY KEY (`staff_id`, `date`, `slot`)
);
--> statement-breakpoint
WITH RECURSIVE `claimed_slots` (`staff_id`, `date`, `slot`, `last_slot`) AS (
  SELECT `staff_id`, `date`, `slot_start`, `slot_start` + `slot_count` - 1
  FROM `reservation`
  WHERE `expires_at` > unixepoch()
  UNION ALL
  SELECT `staff_id`, `date`, `slot` + 1, `last_slot`
  FROM `claimed_slots`
  WHERE `slot` < `last_slot`
)
INSERT INTO `_active_reservation_slot_audit` (`staff_id`, `date`, `slot`)
SELECT `staff_id`, `date`, `slot` FROM `claimed_slots`;
--> statement-breakpoint
INSERT INTO `reservation_day_occupancy`
  (`staff_id`, `date`, `slot_duration_minutes`, `bits_low`, `bits_high`, `created_at`, `updated_at`)
SELECT
  `staff_id`,
  `date`,
  15,
  SUM(CASE WHEN `slot` < 48 THEN (1 << `slot`) ELSE 0 END),
  SUM(CASE WHEN `slot` >= 48 THEN (1 << (`slot` - 48)) ELSE 0 END),
  unixepoch(),
  unixepoch()
FROM `_active_reservation_slot_audit`
GROUP BY `staff_id`, `date`;
--> statement-breakpoint
DROP TABLE `_active_reservation_slot_audit`;
--> statement-breakpoint
CREATE TRIGGER `reservation_release_day_occupancy_after_delete`
AFTER DELETE ON `reservation`
BEGIN
  UPDATE `reservation_day_occupancy`
  SET
    `bits_low` = `bits_low` & ~OLD.`occupancy_bits_low`,
    `bits_high` = `bits_high` & ~OLD.`occupancy_bits_high`,
    `updated_at` = unixepoch()
  WHERE `staff_id` = OLD.`staff_id` AND `date` = OLD.`date`;

  DELETE FROM `reservation_day_occupancy`
  WHERE `staff_id` = OLD.`staff_id`
    AND `date` = OLD.`date`
    AND `bits_low` = 0
    AND `bits_high` = 0;
END;
