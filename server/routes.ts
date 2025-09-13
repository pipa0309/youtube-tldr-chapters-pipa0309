import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./utils/storage";
import { z } from "zod";
import { youtubeRequestSchema } from "@shared/schema";
import { YouTubeService } from "./services/youtube";
import { LLMService } from "./services/llm";
import { CacheService } from "./services/cache";
import { AnalyticsService } from "./services/analytics";
import { retryOperation } from "./utils/retry";

export async function registerRoutes(app: Express): Promise<Server> {
  // YouTube TLDR API endpoint
  app.get("/api/build", async (req, res) => {
    const startTime = Date.now();
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    try {
      // Validate request parameters
      const params = youtubeRequestSchema.parse({
        url: req.query.url,
        lang: req.query.lang || 'ru',
        model: req.query.model || 'gpt-5'
      });

      const videoId = extractVideoId(params.url);
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: "Invalid YouTube URL format"
        });
      }

      // Initialize services
      const youtubeService = new YouTubeService();
      const llmService = new LLMService();
      const cacheService = new CacheService();
      const analyticsService = new AnalyticsService();

      // Generate cache key
      const cacheKey = await cacheService.generateCacheKey(videoId, params.lang, params.model);

      // Check cache first (unless nocache param is set)
      if (!req.query.nocache) {
        const cachedResult = await cacheService.get(cacheKey);
        if (cachedResult) {
          await analyticsService.logRequest({
            videoId,
            endpoint: '/api/build',
            method: 'GET',
            statusCode: 200,
            responseTime: Date.now() - startTime,
            userAgent,
            ipAddress
          });

          return res.json({
            ...cachedResult,
            cached: true,
            responseTime: Date.now() - startTime
          });
        }
      }

      // Get video metadata
      const metadata = await retryOperation(
        () => youtubeService.getVideoMetadata(videoId),
        { maxRetries: 3, delay: 1000 }
      );

      // Get transcript with retry logic
      const transcript = await retryOperation(
        () => youtubeService.getTranscript(videoId, [params.lang, 'en']),
        { maxRetries: 3, delay: 1000 }
      );

      if (!transcript.text || transcript.text.length < 50) {
        const errorResponse = {
          success: false,
          videoId,
          videoTitle: metadata?.title || null,
          error: `No transcript available. Reason: ${transcript.reason || 'unknown'}`,
          responseTime: Date.now() - startTime,
          transcriptLength: 0
        };

        await analyticsService.logRequest({
          videoId,
          endpoint: '/api/build',
          method: 'GET',
          statusCode: 400,
          responseTime: Date.now() - startTime,
          userAgent,
          ipAddress,
          errorMessage: errorResponse.error
        });

        return res.status(400).json(errorResponse);
      }

      // Generate TLDR and chapters using LLM
      const llmResult = await retryOperation(
        () => llmService.generateTLDRAndChapters(transcript.text, params.lang, params.model),
        { maxRetries: 2, delay: 2000 }
      );

      const response = {
        success: true,
        videoId,
        videoTitle: metadata?.title || null,
        tldr: llmResult.tldr,
        chapters: llmResult.chapters,
        model: params.model,
        processedAt: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        transcriptLength: transcript.text.length
      };

      // Cache the result
      await cacheService.set(cacheKey, response, 3600); // Cache for 1 hour

      // Log successful request
      await analyticsService.logRequest({
        videoId,
        endpoint: '/api/build',
        method: 'GET',
        statusCode: 200,
        responseTime: response.responseTime,
        userAgent,
        ipAddress
      });

      res.json(response);

    } catch (error) {
      console.error('API Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      const statusCode = error instanceof z.ZodError ? 400 : 500;

      await storage.createApiLog({
        videoId: req.query.url ? extractVideoId(req.query.url as string) : null,
        endpoint: '/api/build',
        method: 'GET',
        statusCode,
        responseTime: Date.now() - startTime,
        userAgent,
        ipAddress,
        errorMessage
      });

      res.status(statusCode).json({
        success: false,
        error: statusCode === 400 ? errorMessage : 'Internal server error',
        responseTime: Date.now() - startTime
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });


  const httpServer = createServer(app);
  return httpServer;
}

function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Handle youtu.be format
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    
    // Handle youtube.com format
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }
    
    return null;
  } catch {
    return null;
  }
}
