CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`language` text NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`sources` text DEFAULT '[]' NOT NULL,
	`reviewer` text,
	`approved_at` text,
	`delivery_id` text,
	`delivery_started_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_referrals_email_created` ON `referrals` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_referrals_created` ON `referrals` (`created_at`);