import { apiRequest } from '@/lib/queryClient';
import type { YoutubeResponse, YoutubeRequest } from "@shared/schema";

export interface TranscriptTestResult {
  videoId: string;
  videoTitle?: string;
  transcriptTests: Array<{
    method: string;
    status: 'pending' | 'success' | 'error' | 'warning';
    message: string;
    details?: any;
  }>;
  finalTranscript?: {
    text: string;
    segments: Array<{ start: number; end: number; text: string }>;
    method: string;
  };
  error?: string;
}

export class YouTubeAPI {
  static async processVideo(params: YoutubeRequest): Promise<YoutubeResponse> {
    const searchParams = new URLSearchParams({
      url: params.url,
      lang: params.lang || 'ru',
      model: params.model || 'gpt-5'
    });

    const response = await apiRequest('GET', `/api/build?${searchParams.toString()}`);
    return await response.json();
  }

  static async testTranscript(url: string): Promise<TranscriptTestResult> {
    const response = await apiRequest('GET', `/api/test-transcript?url=${encodeURIComponent(url)}`);
    return await response.json();
  }

  static async getHealth(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await apiRequest('GET', '/api/health');
    return await response.json();
  }

  static extractVideoId(url: string): string | null {
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

  static isValidYouTubeUrl(url: string): boolean {
    return this.extractVideoId(url) !== null;
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
