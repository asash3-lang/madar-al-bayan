CREATE TABLE `search_events` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`normalized_question` text NOT NULL,
	`language` text NOT NULL,
	`outcome` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_search_events_created` ON `search_events` (`created_at`);