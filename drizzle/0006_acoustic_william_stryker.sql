ALTER TABLE `message_numbers` ADD `is_urgent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `referrals` ADD `cc` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `referrals` ADD `bcc` text DEFAULT '[]' NOT NULL;