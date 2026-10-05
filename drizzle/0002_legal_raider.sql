CREATE TABLE `contact_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`contact` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`language` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contact_contact_created` ON `contact_messages` (`contact`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_contact_created` ON `contact_messages` (`created_at`);