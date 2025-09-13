import { storage } from "../utils/storage";
import type { InsertApiLog } from "@shared/schema";

export class AnalyticsService {
  async logRequest(data: InsertApiLog): Promise<void> {
    try {
      await storage.createApiLog(data);
    } catch (error) {
      console.error('Failed to log request:', error);
      // Don't throw - analytics failure shouldn't break the main flow
    }
  }

  async getStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRate: number;
    averageResponseTime: number;
  }> {
    try {
      // This would need to be implemented in the storage layer
      // For now, return mock data
      return {
        totalRequests: 0,
        successfulRequests: 0,
        errorRate: 0,
        averageResponseTime: 0
      };
    } catch (error) {
      console.error('Failed to get analytics stats:', error);
      return {
        totalRequests: 0,
        successfulRequests: 0,
        errorRate: 0,
        averageResponseTime: 0
      };
    }
  }

  async getMostProcessedVideos(limit: number = 10): Promise<Array<{
    videoId: string;
    count: number;
  }>> {
    try {
      // This would need to be implemented in the storage layer
      return [];
    } catch (error) {
      console.error('Failed to get most processed videos:', error);
      return [];
    }
  }
}
