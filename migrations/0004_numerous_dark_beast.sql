ALTER TABLE `reservation` ADD `owner_user_id` text REFERENCES user(id) ON DELETE SET NULL;--> statement-breakpoint
UPDATE `reservation`
SET `owner_user_id` = (
  SELECT `user`.`id`
  FROM `user`
  WHERE lower(trim(`user`.`email`)) = lower(trim(`reservation`.`email`))
)
WHERE EXISTS (
  SELECT 1
  FROM `user`
  WHERE lower(trim(`user`.`email`)) = lower(trim(`reservation`.`email`))
);--> statement-breakpoint
CREATE INDEX `reservation_owner_user_idx` ON `reservation` (`owner_user_id`);
