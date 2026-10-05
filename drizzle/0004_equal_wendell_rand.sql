CREATE TABLE `message_numbers` (
	`number` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_numbers_request_id_unique` ON `message_numbers` (`request_id`);--> statement-breakpoint
ALTER TABLE `referrals` ADD `sent_at` text;--> statement-breakpoint
ALTER TABLE `referrals` ADD `reply_revision` integer DEFAULT 0 NOT NULL;