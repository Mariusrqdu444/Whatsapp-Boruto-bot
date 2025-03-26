import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// WhatsApp session model
export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  phoneNumber: text("phone_number").notNull(),
  connectionType: text("connection_type").notNull(), // 'creds' or 'phoneId'
  phoneId: text("phone_id"),
  targets: text("targets").notNull(),
  messagePath: text("message_path").notNull(),
  messageText: text("message_text").notNull(),
  delay: integer("delay").notNull().default(10),
  messageCount: integer("message_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Define schemas for insertion
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWhatsappSessionSchema = createInsertSchema(whatsappSessions).omit({
  id: true,
  messageCount: true,
  createdAt: true,
  updatedAt: true,
});

// Define types for db operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWhatsappSession = z.infer<typeof insertWhatsappSessionSchema>;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;

// File storage model
export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  storagePath: text("storage_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  createdAt: true,
});

export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;
