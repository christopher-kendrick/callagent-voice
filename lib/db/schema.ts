import { pgTable, serial, text, timestamp, integer, boolean, json, jsonb } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Foreign key to user in auth system
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Scripts table
export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Foreign key to user in auth system
  title: text("title").notNull(),
  content: text("content").notNull(),
  isTemplate: boolean("is_template").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Call records table
export const callRecords = pgTable("call_records", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Foreign key to user in auth system
  scriptId: integer("script_id").references(() => scripts.id),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, failed
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
})

// Call details table (for individual calls within a call record)
export const callDetails = pgTable("call_details", {
  id: serial("id").primaryKey(),
  callRecordId: integer("call_record_id")
    .references(() => callRecords.id)
    .notNull(),
  contactId: integer("contact_id")
    .references(() => contacts.id)
    .notNull(),
  twilioSid: text("twilio_sid"),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, failed
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  recordingUrl: text("recording_url"),
  transcription: text("transcription"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Prompts table for Hume AI
export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Foreign key to user in auth system
  name: text("name").notNull(),
  text: text("text").notNull(),
  humePromptId: text("hume_prompt_id"), // ID returned from Hume API
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Configs table for Hume AI
export const configs = pgTable("configs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Foreign key to user in auth system
  name: text("name").notNull(),
  humeConfigId: text("hume_config_id"), // ID returned from Hume API
  promptId: text("prompt_id"), // ID of the prompt
  promptVersion: integer("prompt_version").default(0),
  eviVersion: text("evi_version").default("2"),
  voiceProvider: text("voice_provider").default("HUME_AI"),
  voiceName: text("voice_name"),
  modelProvider: text("model_provider").default("ANTHROPIC"),
  modelResource: text("model_resource").default("claude-3-7-sonnet-latest"),
  temperature: integer("temperature").default(1),
  onNewChatEnabled: boolean("on_new_chat_enabled").default(false),
  onNewChatText: text("on_new_chat_text").default(""),
  onInactivityTimeoutEnabled: boolean("on_inactivity_timeout_enabled").default(false),
  onInactivityTimeoutText: text("on_inactivity_timeout_text").default(""),
  onMaxDurationTimeoutEnabled: boolean("on_max_duration_timeout_enabled").default(false),
  onMaxDurationTimeoutText: text("on_max_duration_timeout_text").default(""),
  rawConfig: jsonb("raw_config"), // Store the raw config for reference
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Define relations
export const contactsRelations = relations(contacts, ({ many }) => ({
  callDetails: many(callDetails),
}))

export const scriptsRelations = relations(scripts, ({ many }) => ({
  callRecords: many(callRecords),
}))

export const callRecordsRelations = relations(callRecords, ({ one, many }) => ({
  script: one(scripts, {
    fields: [callRecords.scriptId],
    references: [scripts.id],
  }),
  callDetails: many(callDetails),
}))

export const callDetailsRelations = relations(callDetails, ({ one }) => ({
  callRecord: one(callRecords, {
    fields: [callDetails.callRecordId],
    references: [callRecords.id],
  }),
  contact: one(contacts, {
    fields: [callDetails.contactId],
    references: [contacts.id],
  }),
}))

export const promptsRelations = relations(prompts, ({ one }) => ({
  user: one(configs, {
    fields: [prompts.userId],
    references: [configs.userId],
  }),
}))

export const configsRelations = relations(configs, ({ one }) => ({
  user: one(prompts, {
    fields: [configs.userId],
    references: [prompts.userId],
  }),
}))

// Types
export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert

export type Script = typeof scripts.$inferSelect
export type NewScript = typeof scripts.$inferInsert

export type CallRecord = typeof callRecords.$inferSelect
export type NewCallRecord = typeof callRecords.$inferInsert

export type CallDetail = typeof callDetails.$inferSelect
export type NewCallDetail = typeof callDetails.$inferInsert

export type Prompt = typeof prompts.$inferSelect
export type NewPrompt = typeof prompts.$inferInsert

export type Config = typeof configs.$inferSelect
export type NewConfig = typeof configs.$inferInsert
