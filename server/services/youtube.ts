interface VideoMetadata {
  title: string;
  duration?: string;
  description?: string;
}

interface TranscriptResult {
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
  reason?: string;
}

export class YouTubeService {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY || "";
  }

  /**
   * Get video metadata using YouTube Data API v3
   */
  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      if (!this.apiKey) {
        console.warn('YouTube API key not configured, skipping metadata fetch');
        return null;
      }

      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${this.apiKey}`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = data.items[0];
      return {
        title: video.snippet.title,
        duration: video.contentDetails.duration,
        description: video.snippet.description
      };

    } catch (error) {
      console.error('Failed to fetch video metadata:', error);
      
      // Fallback to oEmbed
      try {
        return await this.getVideoMetadataFallback(videoId);
      } catch (fallbackError) {
        console.error('Fallback metadata fetch failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Fallback metadata using oEmbed
   */
  private async getVideoMetadataFallback(videoId: string): Promise<VideoMetadata | null> {
    const oembedUrl = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`oEmbed error: ${response.status}`);
    }

    const data = await response.json();
    return {
      title: data.title
    };
  }

  /**
   * Get video transcript with multiple fallback methods
   */
  async getTranscript(videoId: string, preferredLangs: string[] = ['en']): Promise<TranscriptResult> {
    console.log(`Attempting to fetch transcript for video ${videoId}, preferred languages: ${preferredLangs.join(', ')}`);

    // Method 1: Try YouTube Data API captions
    try {
      const result = await this.getTranscriptFromDataAPI(videoId, preferredLangs);
      if (result.text) {
        console.log(`Successfully fetched transcript via Data API (${result.text.length} chars)`);
        return result;
      }
    } catch (error) {
      console.warn('YouTube Data API transcript fetch failed:', error);
    }

    // Method 2: Try unofficial transcript API
    try {
      const result = await this.getTranscriptFromUnofficial(videoId, preferredLangs);
      if (result.text) {
        console.log(`Successfully fetched transcript via unofficial API (${result.text.length} chars)`);
        return result;
      }
    } catch (error) {
      console.warn('Unofficial transcript fetch failed:', error);
    }

    // Method 3: Try timedtext endpoint
    try {
      const result = await this.getTranscriptFromTimedText(videoId, preferredLangs);
      if (result.text) {
        console.log(`Successfully fetched transcript via timedtext (${result.text.length} chars)`);
        return result;
      }
    } catch (error) {
      console.warn('Timedtext transcript fetch failed:', error);
    }

    return {
      text: '',
      segments: [],
      reason: 'no_transcript_available_all_methods_failed'
    };
  }

  /**
   * Method 1: YouTube Data API v3 captions
   */
  private async getTranscriptFromDataAPI(videoId: string, preferredLangs: string[]): Promise<TranscriptResult> {
    if (!this.apiKey) {
      throw new Error('YouTube API key required for Data API method');
    }

    // First, get list of available captions
    const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${this.apiKey}`;
    
    const captionsResponse = await fetch(captionsListUrl, {
      signal: AbortSignal.timeout(10000)
    });

    if (!captionsResponse.ok) {
      throw new Error(`Captions list API error: ${captionsResponse.status}`);
    }

    const captionsData = await captionsResponse.json();

    if (!captionsData.items || captionsData.items.length === 0) {
      throw new Error('No captions available');
    }

    // Find the best caption track
    let selectedCaption = null;
    
    // First try to find preferred language
    for (const lang of preferredLangs) {
      selectedCaption = captionsData.items.find((caption: any) => 
        caption.snippet.language === lang
      );
      if (selectedCaption) break;
    }

    // If no preferred language found, use any available
    if (!selectedCaption) {
      selectedCaption = captionsData.items[0];
    }

    // Download the caption content
    const captionUrl = `https://www.googleapis.com/youtube/v3/captions/${selectedCaption.id}?key=${this.apiKey}`;
    
    const captionResponse = await fetch(captionUrl, {
      signal: AbortSignal.timeout(15000)
    });

    if (!captionResponse.ok) {
      throw new Error(`Caption download error: ${captionResponse.status}`);
    }

    const captionContent = await captionResponse.text();
    return this.parseTranscriptContent(captionContent);
  }

  /**
   * Method 2: Unofficial YouTube transcript API
   */
  private async getTranscriptFromUnofficial(videoId: string, preferredLangs: string[]): Promise<TranscriptResult> {
    // Try multiple unofficial endpoints
    const endpoints = [
      `https://youtube-transcript-api.vercel.app/api/transcript?videoId=${videoId}`,
      `https://yt-transcript-api.herokuapp.com/transcript?video_id=${videoId}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          signal: AbortSignal.timeout(15000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        if (data.transcript || data.segments) {
          const segments = data.transcript || data.segments || [];
          const text = segments.map((seg: any) => seg.text || seg.content || '').join(' ');
          
          return {
            text: text.trim(),
            segments: segments.map((seg: any) => ({
              start: seg.start || seg.offset || 0,
              end: seg.end || (seg.start + seg.duration) || 0,
              text: seg.text || seg.content || ''
            }))
          };
        }
      } catch (error) {
        console.warn(`Unofficial API endpoint ${endpoint} failed:`, error);
        continue;
      }
    }

    throw new Error('All unofficial transcript endpoints failed');
  }

  /**
   * Method 3: Direct timedtext endpoint access
   */
  private async getTranscriptFromTimedText(videoId: string, preferredLangs: string[]): Promise<TranscriptResult> {
    // This method requires reverse engineering YouTube's player response
    // For now, we'll implement a placeholder that could be extended
    
    const playerUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    const response = await fetch(playerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch player page: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract player response (simplified version)
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
    
    if (!playerResponseMatch) {
      throw new Error('Could not extract player response');
    }

    try {
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (!captionTracks || captionTracks.length === 0) {
        throw new Error('No caption tracks found in player response');
      }

      // Find best caption track
      let selectedTrack = null;
      
      for (const lang of preferredLangs) {
        selectedTrack = captionTracks.find((track: any) => 
          track.languageCode === lang
        );
        if (selectedTrack) break;
      }

      if (!selectedTrack) {
        selectedTrack = captionTracks[0];
      }

      // Fetch the actual transcript
      const transcriptResponse = await fetch(selectedTrack.baseUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!transcriptResponse.ok) {
        throw new Error(`Transcript fetch failed: ${transcriptResponse.status}`);
      }

      const transcriptXml = await transcriptResponse.text();
      return this.parseTranscriptXML(transcriptXml);

    } catch (error) {
      throw new Error(`Failed to parse player response: ${error}`);
    }
  }

  /**
   * Parse transcript content (handles various formats)
   */
  private parseTranscriptContent(content: string): TranscriptResult {
    // Try to parse as XML first
    if (content.trim().startsWith('<')) {
      return this.parseTranscriptXML(content);
    }

    // Try to parse as JSON
    try {
      const json = JSON.parse(content);
      if (Array.isArray(json)) {
        const text = json.map(item => item.text || '').join(' ');
        return {
          text: text.trim(),
          segments: json.map(item => ({
            start: item.start || 0,
            end: item.end || 0,
            text: item.text || ''
          }))
        };
      }
    } catch {
      // Not JSON, treat as plain text
    }

    // Treat as plain text
    return {
      text: content.trim(),
      segments: []
    };
  }

  /**
   * Parse YouTube transcript XML format
   */
  private parseTranscriptXML(xml: string): TranscriptResult {
    const segments: Array<{ start: number; end: number; text: string }> = [];
    
    // Simple XML parsing (could be improved with a proper XML parser)
    const textMatches = xml.match(/<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g);
    
    if (!textMatches) {
      return { text: '', segments: [] };
    }

    for (const match of textMatches) {
      const startMatch = match.match(/start="([^"]*)"/);
      const durMatch = match.match(/dur="([^"]*)"/);
      const textMatch = match.match(/>([^<]*)</);

      if (startMatch && durMatch && textMatch) {
        const start = parseFloat(startMatch[1]);
        const duration = parseFloat(durMatch[1]);
        const text = this.decodeXMLEntities(textMatch[1]);

        segments.push({
          start,
          end: start + duration,
          text
        });
      }
    }

    const fullText = segments.map(seg => seg.text).join(' ');

    return {
      text: fullText.trim(),
      segments
    };
  }

  /**
   * Decode XML entities
   */
  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => 
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/&#(\d+);/g, (match, dec) => 
        String.fromCharCode(parseInt(dec, 10))
      );
  }
}
