import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const videoProcessingJobs = pgTable("video_processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: text("video_id").notNull(),
  videoUrl: text("video_url").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  tldr: text("tldr"),
  chapters: jsonb("chapters").$type<Array<{ time: string; title: string }>>(),
  model: text("model").notNull(),
  language: text("language").notNull().default("ru"),
  transcriptLength: integer("transcript_length"),
  responseTime: integer("response_time"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const apiLogs = pgTable("api_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: text("video_id"),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const audioUploads = pgTable("audio_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  status: text("status").notNull().default("uploaded"), // uploaded, processing, completed, failed
  transcriptText: text("transcript_text"),
  detectedLanguage: text("detected_language"),
  processingTime: integer("processing_time"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const batchJobs = pgTable("batch_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // "youtube_batch", "audio_batch"
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed, cancelled
  totalItems: integer("total_items").notNull(),
  processedItems: integer("processed_items").default(0),
  successfulItems: integer("successful_items").default(0),
  failedItems: integer("failed_items").default(0),
  results: jsonb("results").$type<Array<{ id: string; status: string; result?: any; error?: string }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const processingMetrics = pgTable("processing_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  processingType: text("processing_type").notNull(), // "youtube", "audio", "batch"
  totalRequests: integer("total_requests").default(0),
  successfulRequests: integer("successful_requests").default(0),
  failedRequests: integer("failed_requests").default(0),
  avgResponseTime: integer("avg_response_time").default(0),
  topLanguage: text("top_language"),
  topModel: text("top_model"),
});

export const insertVideoJobSchema = createInsertSchema(videoProcessingJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertApiLogSchema = createInsertSchema(apiLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAudioUploadSchema = createInsertSchema(audioUploads).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertBatchJobSchema = createInsertSchema(batchJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertProcessingMetricsSchema = createInsertSchema(processingMetrics).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type VideoProcessingJob = typeof videoProcessingJobs.$inferSelect;
export type InsertVideoJob = z.infer<typeof insertVideoJobSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;
export type InsertApiLog = z.infer<typeof insertApiLogSchema>;
export type AudioUpload = typeof audioUploads.$inferSelect;
export type InsertAudioUpload = z.infer<typeof insertAudioUploadSchema>;
export type BatchJob = typeof batchJobs.$inferSelect;
export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type ProcessingMetrics = typeof processingMetrics.$inferSelect;
export type InsertProcessingMetrics = z.infer<typeof insertProcessingMetricsSchema>;

// API request/response schemas
export const youtubeRequestSchema = z.object({
  url: z.string().url(),
  lang: z.string().optional().default("ru"),
  model: z.string().optional().default("gpt-5"),
});

export const chapterSchema = z.object({
  time: z.string(),
  title: z.string(),
});

export const youtubeResponseSchema = z.object({
  success: z.boolean(),
  videoId: z.string(),
  videoTitle: z.string().nullable(),
  tldr: z.string().nullable(),
  chapters: z.array(chapterSchema),
  model: z.string(),
  processedAt: z.string(),
  responseTime: z.number(),
  transcriptLength: z.number(),
  cached: z.boolean().optional(),
  error: z.string().optional(),
});

export type YoutubeRequest = z.infer<typeof youtubeRequestSchema>;
export type YoutubeResponse = z.infer<typeof youtubeResponseSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
