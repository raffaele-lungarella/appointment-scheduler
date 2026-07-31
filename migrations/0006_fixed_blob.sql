CREATE TABLE `rate_limit` (
	`key_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`key_hash`, `window_start`),
	CONSTRAINT "rate_limit_request_count_positive_check" CHECK("rate_limit"."request_count" > 0)
);
--> statement-breakpoint
CREATE INDEX `rate_limit_expires_at_idx` ON `rate_limit` (`expires_at`);