import { 
  type User, 
  type InsertUser, 
  type VideoProcessingJob, 
  type InsertVideoJob, 
  type ApiLog, 
  type InsertApiLog,
  type AudioUpload,
  type InsertAudioUpload,
  type BatchJob,
  type InsertBatchJob,
  type ProcessingMetrics,
  type InsertProcessingMetrics,
  users,
  videoProcessingJobs,
  apiLogs,
  audioUploads,
  batchJobs,
  processingMetrics
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq, desc, count, avg, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Video processing jobs
  createVideoJob(job: InsertVideoJob): Promise<VideoProcessingJob>;
  updateVideoJob(id: string, job: Partial<VideoProcessingJob>): Promise<VideoProcessingJob>;
  getVideoJob(id: string): Promise<VideoProcessingJob | undefined>;
  
  // API logs
  createApiLog(log: InsertApiLog): Promise<ApiLog>;
  getApiLogs(limit?: number): Promise<ApiLog[]>;
  
  // Audio uploads
  createAudioUpload(upload: InsertAudioUpload): Promise<AudioUpload>;
  updateAudioUpload(id: string, upload: Partial<AudioUpload>): Promise<AudioUpload>;
  getAudioUpload(id: string): Promise<AudioUpload | undefined>;
  getAudioUploads(limit?: number): Promise<AudioUpload[]>;
  
  // Batch jobs
  createBatchJob(job: InsertBatchJob): Promise<BatchJob>;
  updateBatchJob(id: string, job: Partial<BatchJob>): Promise<BatchJob>;
  getBatchJob(id: string): Promise<BatchJob | undefined>;
  getBatchJobs(limit?: number): Promise<BatchJob[]>;
  
  // Processing metrics
  createProcessingMetrics(metrics: InsertProcessingMetrics): Promise<ProcessingMetrics>;
  getProcessingMetrics(days?: number): Promise<ProcessingMetrics[]>;
  
  // Analytics
  getProcessingStats(): Promise<{
    totalProcessed: number;
    successRate: number;
    avgResponseTime: number;
    topLanguages: Array<{ language: string; count: number }>;
  }>;
  
  getDashboardMetrics(): Promise<{
    totalJobs: number;
    successRate: number;
    avgResponseTime: number;
    recentJobs: VideoProcessingJob[];
    audioUploads: number;
    batchJobs: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private videoJobs: Map<string, VideoProcessingJob>;
  private apiLogs: Map<string, ApiLog>;

  constructor() {
    this.users = new Map();
    this.videoJobs = new Map();
    this.apiLogs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createVideoJob(insertJob: InsertVideoJob): Promise<VideoProcessingJob> {
    const id = randomUUID();
    const videoJob: VideoProcessingJob = {
      id,
      videoId: insertJob.videoId,
      videoUrl: insertJob.videoUrl,
      status: insertJob.status || 'pending',
      tldr: insertJob.tldr || null,
      chapters: insertJob.chapters || null,
      model: insertJob.model,
      language: insertJob.language,
      transcriptLength: insertJob.transcriptLength || null,
      responseTime: insertJob.responseTime || null,
      errorMessage: insertJob.errorMessage || null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.videoJobs.set(id, videoJob);
    return videoJob;
  }

  async updateVideoJob(id: string, updates: Partial<VideoProcessingJob>): Promise<VideoProcessingJob> {
    const existing = this.videoJobs.get(id);
    if (!existing) {
      throw new Error('Video job not found');
    }
    const updated = { ...existing, ...updates };
    this.videoJobs.set(id, updated);
    return updated;
  }

  async getVideoJob(id: string): Promise<VideoProcessingJob | undefined> {
    return this.videoJobs.get(id);
  }

  async createApiLog(insertLog: InsertApiLog): Promise<ApiLog> {
    const id = randomUUID();
    const apiLog: ApiLog = {
      id,
      videoId: insertLog.videoId || null,
      endpoint: insertLog.endpoint,
      method: insertLog.method,
      statusCode: insertLog.statusCode,
      responseTime: insertLog.responseTime || null,
      userAgent: insertLog.userAgent || null,
      ipAddress: insertLog.ipAddress || null,
      errorMessage: insertLog.errorMessage || null,
      createdAt: new Date(),
    };
    this.apiLogs.set(id, apiLog);
    return apiLog;
  }

  async getApiLogs(limit = 50): Promise<ApiLog[]> {
    const logs = Array.from(this.apiLogs.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    return logs.slice(0, limit);
  }

  async getProcessingStats(): Promise<{
    totalProcessed: number;
    successRate: number;
    avgResponseTime: number;
    topLanguages: Array<{ language: string; count: number }>;
  }> {
    const jobs = Array.from(this.videoJobs.values());
    const totalProcessed = jobs.length;
    const successful = jobs.filter(job => job.status === 'completed').length;
    const successRate = totalProcessed > 0 ? (successful / totalProcessed) * 100 : 0;
    
    const totalResponseTime = jobs
      .filter(job => job.responseTime)
      .reduce((sum, job) => sum + (job.responseTime || 0), 0);
    const avgResponseTime = successful > 0 ? totalResponseTime / successful : 0;

    const languageCounts = jobs.reduce((acc, job) => {
      acc[job.language] = (acc[job.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalProcessed,
      successRate,
      avgResponseTime,
      topLanguages,
    };
  }

  // Placeholder implementations for new methods to maintain interface compatibility
  async createAudioUpload(): Promise<AudioUpload> {
    throw new Error("Audio uploads not supported in MemStorage");
  }
  async updateAudioUpload(): Promise<AudioUpload> { 
    throw new Error("Audio uploads not supported in MemStorage");
  }
  async getAudioUpload(): Promise<AudioUpload | undefined> {
    return undefined;
  }
  async getAudioUploads(): Promise<AudioUpload[]> {
    return [];
  }
  async createBatchJob(): Promise<BatchJob> {
    throw new Error("Batch jobs not supported in MemStorage");
  }
  async updateBatchJob(): Promise<BatchJob> {
    throw new Error("Batch jobs not supported in MemStorage");
  }
  async getBatchJob(): Promise<BatchJob | undefined> {
    return undefined;
  }
  async getBatchJobs(): Promise<BatchJob[]> {
    return [];
  }
  async createProcessingMetrics(): Promise<ProcessingMetrics> {
    throw new Error("Processing metrics not supported in MemStorage");
  }
  async getProcessingMetrics(): Promise<ProcessingMetrics[]> {
    return [];
  }
  async getDashboardMetrics() {
    return {
      totalJobs: 0,
      successRate: 0,
      avgResponseTime: 0,
      recentJobs: [],
      audioUploads: 0,
      batchJobs: 0,
    };
  }
}

export class PostgreSQLStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Video processing jobs
  async createVideoJob(insertJob: InsertVideoJob): Promise<VideoProcessingJob> {
    const result = await this.db.insert(videoProcessingJobs).values(insertJob).returning();
    return result[0];
  }

  async updateVideoJob(id: string, job: Partial<VideoProcessingJob>): Promise<VideoProcessingJob> {
    const result = await this.db
      .update(videoProcessingJobs)
      .set(job)
      .where(eq(videoProcessingJobs.id, id))
      .returning();
    return result[0];
  }

  async getVideoJob(id: string): Promise<VideoProcessingJob | undefined> {
    const result = await this.db.select().from(videoProcessingJobs).where(eq(videoProcessingJobs.id, id)).limit(1);
    return result[0];
  }

  // API logs
  async createApiLog(insertLog: InsertApiLog): Promise<ApiLog> {
    const result = await this.db.insert(apiLogs).values(insertLog).returning();
    return result[0];
  }

  async getApiLogs(limit = 100): Promise<ApiLog[]> {
    return await this.db.select().from(apiLogs).orderBy(desc(apiLogs.createdAt)).limit(limit);
  }

  // Audio uploads
  async createAudioUpload(insertUpload: InsertAudioUpload): Promise<AudioUpload> {
    const result = await this.db.insert(audioUploads).values(insertUpload).returning();
    return result[0];
  }

  async updateAudioUpload(id: string, upload: Partial<AudioUpload>): Promise<AudioUpload> {
    const result = await this.db
      .update(audioUploads)
      .set(upload)
      .where(eq(audioUploads.id, id))
      .returning();
    return result[0];
  }

  async getAudioUpload(id: string): Promise<AudioUpload | undefined> {
    const result = await this.db.select().from(audioUploads).where(eq(audioUploads.id, id)).limit(1);
    return result[0];
  }

  async getAudioUploads(limit = 100): Promise<AudioUpload[]> {
    return await this.db.select().from(audioUploads).orderBy(desc(audioUploads.createdAt)).limit(limit);
  }

  // Batch jobs
  async createBatchJob(insertJob: InsertBatchJob): Promise<BatchJob> {
    const result = await this.db.insert(batchJobs).values(insertJob).returning();
    return result[0];
  }

  async updateBatchJob(id: string, job: Partial<BatchJob>): Promise<BatchJob> {
    const result = await this.db
      .update(batchJobs)
      .set(job)
      .where(eq(batchJobs.id, id))
      .returning();
    return result[0];
  }

  async getBatchJob(id: string): Promise<BatchJob | undefined> {
    const result = await this.db.select().from(batchJobs).where(eq(batchJobs.id, id)).limit(1);
    return result[0];
  }

  async getBatchJobs(limit = 100): Promise<BatchJob[]> {
    return await this.db.select().from(batchJobs).orderBy(desc(batchJobs.createdAt)).limit(limit);
  }

  // Processing metrics
  async createProcessingMetrics(insertMetrics: InsertProcessingMetrics): Promise<ProcessingMetrics> {
    const result = await this.db.insert(processingMetrics).values(insertMetrics).returning();
    return result[0];
  }

  async getProcessingMetrics(days = 30): Promise<ProcessingMetrics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.db
      .select()
      .from(processingMetrics)
      .where(sql`${processingMetrics.date} >= ${cutoffDate}`)
      .orderBy(desc(processingMetrics.date));
  }

  // Analytics
  async getProcessingStats() {
    const totalResult = await this.db
      .select({ count: count() })
      .from(videoProcessingJobs);
    
    const successResult = await this.db
      .select({ count: count() })
      .from(videoProcessingJobs)
      .where(eq(videoProcessingJobs.status, 'completed'));

    const avgTimeResult = await this.db
      .select({ avg: avg(videoProcessingJobs.responseTime) })
      .from(videoProcessingJobs)
      .where(sql`${videoProcessingJobs.responseTime} IS NOT NULL`);

    const languagesResult = await this.db
      .select({
        language: videoProcessingJobs.language,
        count: count()
      })
      .from(videoProcessingJobs)
      .groupBy(videoProcessingJobs.language)
      .orderBy(desc(count()))
      .limit(5);

    const totalProcessed = totalResult[0]?.count || 0;
    const successfulProcessed = successResult[0]?.count || 0;

    return {
      totalProcessed: Number(totalProcessed),
      successRate: totalProcessed > 0 ? (Number(successfulProcessed) / Number(totalProcessed)) * 100 : 0,
      avgResponseTime: Number(avgTimeResult[0]?.avg) || 0,
      topLanguages: languagesResult.map(r => ({ 
        language: r.language, 
        count: Number(r.count) 
      }))
    };
  }

  async getDashboardMetrics() {
    const totalJobsResult = await this.db.select({ count: count() }).from(videoProcessingJobs);
    const successfulJobsResult = await this.db
      .select({ count: count() })
      .from(videoProcessingJobs)
      .where(eq(videoProcessingJobs.status, 'completed'));
    
    const avgTimeResult = await this.db
      .select({ avg: avg(videoProcessingJobs.responseTime) })
      .from(videoProcessingJobs)
      .where(sql`${videoProcessingJobs.responseTime} IS NOT NULL`);

    const recentJobs = await this.db
      .select()
      .from(videoProcessingJobs)
      .orderBy(desc(videoProcessingJobs.createdAt))
      .limit(10);

    const audioUploadsResult = await this.db.select({ count: count() }).from(audioUploads);
    const batchJobsResult = await this.db.select({ count: count() }).from(batchJobs);

    const totalJobs = Number(totalJobsResult[0]?.count) || 0;
    const successfulJobs = Number(successfulJobsResult[0]?.count) || 0;

    return {
      totalJobs,
      successRate: totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0,
      avgResponseTime: Number(avgTimeResult[0]?.avg) || 0,
      recentJobs,
      audioUploads: Number(audioUploadsResult[0]?.count) || 0,
      batchJobs: Number(batchJobsResult[0]?.count) || 0,
    };
  }
}

// Use PostgreSQL storage in production, MemStorage for development/testing
export const storage = process.env.DATABASE_URL 
  ? new PostgreSQLStorage() 
  : new MemStorage();
