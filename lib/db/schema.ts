import { pgTable, serial, text, timestamp, integer, boolean, json } from "drizzle-orm/pg-core"
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

// Types
export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert

export type Script = typeof scripts.$inferSelect
export type NewScript = typeof scripts.$inferInsert

export type CallRecord = typeof callRecords.$inferSelect
export type NewCallRecord = typeof callRecords.$inferInsert

export type CallDetail = typeof callDetails.$inferSelect
export type NewCallDetail = typeof callDetails.$inferInsert
