import {index, integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';
export const cases = sqliteTable('cases', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(),
  question: text('question').notNull(), topic: text('topic').notNull(),
  level: text('level').notNull(), responseJson: text('response_json').notNull(),
  decision: text('decision').notNull().default('pending'), note: text('note').notNull().default(''),
  revision: integer('revision').notNull().default(1), lastEventId: text('last_event_id').notNull(),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [index('idx_cases_owner_created').on(t.ownerId, t.createdAt)]);
export const reviewEvents = sqliteTable('review_events', {
  id: text('id').primaryKey(), caseId: text('case_id').notNull().references(()=>cases.id),
  ownerId: text('owner_id').notNull(), fromDecision: text('from_decision'),
  toDecision: text('to_decision').notNull(), note: text('note').notNull(), actor: text('actor').notNull(),
  createdAt: text('created_at').notNull(),
}, t => [index('idx_review_events_case_created').on(t.caseId, t.createdAt)]);
export const referrals=sqliteTable('referrals',{
 id:text('id').primaryKey(),question:text('question').notNull(),language:text('language').notNull(),email:text('email').notNull(),
 status:text('status').notNull().default('pending'),answer:text('answer').notNull().default(''),sources:text('sources').notNull().default('[]'),
 reviewer:text('reviewer'),approvedAt:text('approved_at'),deliveryId:text('delivery_id'),deliveryStartedAt:text('delivery_started_at'),
 cc:text('cc').notNull().default('[]'),bcc:text('bcc').notNull().default('[]'),
 sentAt:text('sent_at'),replyRevision:integer('reply_revision').notNull().default(0),
 createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('idx_referrals_email_created').on(t.email,t.createdAt),index('idx_referrals_created').on(t.createdAt)]);
export const contactMessages=sqliteTable('contact_messages',{
 id:text('id').primaryKey(),contact:text('contact').notNull(),name:text('name').notNull().default(''),
 message:text('message').notNull().default(''),language:text('language').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('idx_contact_contact_created').on(t.contact,t.createdAt),index('idx_contact_created').on(t.createdAt)]);
export const adminSessions=sqliteTable('admin_sessions',{
 tokenHash:text('token_hash').primaryKey(),expiresAt:integer('expires_at').notNull(),createdAt:integer('created_at').notNull(),
},t=>[index('idx_admin_sessions_expiry').on(t.expiresAt)]);
export const adminLoginLimits=sqliteTable('admin_login_limits',{
 bucket:text('bucket').primaryKey(),attempts:integer('attempts').notNull().default(0),resetAt:integer('reset_at').notNull(),
});
export const messageNumbers=sqliteTable('message_numbers',{
 number:integer('number').primaryKey({autoIncrement:true}),requestId:text('request_id').notNull().unique(),isUrgent:integer('is_urgent').notNull().default(0),
 deletedAt:text('deleted_at'),
});
export const searchEvents=sqliteTable('search_events',{
 id:text('id').primaryKey(),question:text('question').notNull(),normalizedQuestion:text('normalized_question').notNull(),
 language:text('language').notNull(),outcome:text('outcome').notNull(),createdAt:text('created_at').notNull(),
},t=>[index('idx_search_events_created').on(t.createdAt)]);
