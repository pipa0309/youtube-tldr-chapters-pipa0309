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
  private readonly isApiKeyValid: boolean;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY || "";
    this.isApiKeyValid = this.validateApiKey(this.apiKey);
    
    if (!this.isApiKeyValid) {
      console.warn('YouTube API key not configured or invalid, some features will be limited');
    }
  }

  /**
   * Validate API key format
   */
  private validateApiKey(apiKey: string): boolean {
    if (!apiKey) return false;
    // Basic validation - YouTube API keys are typically 39 characters
    return apiKey.length >= 30 && apiKey.startsWith('AIza');
  }

  /**
   * Get video metadata using YouTube Data API v3
   */
  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      if (!this.isApiKeyValid) {
        console.warn('YouTube API key not configured, skipping metadata fetch');
        return await this.getVideoMetadataFallback(videoId);
      }

      console.log(`[METADATA] Fetching metadata for video: ${videoId}`);
      
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${this.apiKey}`;
      
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[METADATA] API error ${response.status}: ${errorText}`);
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        console.warn(`[METADATA] Video ${videoId} not found`);
        throw new Error('Video not found');
      }

      const video = data.items[0];
      const metadata = {
        title: video.snippet.title,
        duration: video.contentDetails.duration,
        description: video.snippet.description
      };

      console.log(`[METADATA] Success: ${metadata.title}`);
      return metadata;

    } catch (error) {
      console.error('[METADATA] Failed to fetch video metadata:', error);
      
      // Fallback to oEmbed
      try {
        return await this.getVideoMetadataFallback(videoId);
      } catch (fallbackError) {
        console.error('[METADATA] Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Fallback metadata using oEmbed
   */
  private async getVideoMetadataFallback(videoId: string): Promise<VideoMetadata | null> {
    console.log(`[METADATA] Trying oEmbed fallback for: ${videoId}`);
    
    const oembedUrl = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`;
    
    try {
      const response = await fetch(oembedUrl, {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`oEmbed error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[METADATA] oEmbed success: ${data.title}`);
      
      return {
        title: data.title
      };
    } catch (error) {
      console.error('[METADATA] oEmbed fallback failed:', error);
      throw error;
    }
  }

  /**
   * Get video transcript with multiple fallback methods
   */
  async getTranscript(videoId: string, preferredLangs: string[] = ['en']): Promise<TranscriptResult> {
    console.log(`[TRANSCRIPT] Starting transcript fetch for: ${videoId}, languages: ${preferredLangs.join(', ')}`);

    // Validate video ID format
    if (!this.isValidVideoId(videoId)) {
      throw new Error(`Invalid YouTube video ID: ${videoId}`);
    }

    const methods = [
      this.getTranscriptFromDataAPI.bind(this),
      this.getTranscriptFromUnofficial.bind(this),
      this.getTranscriptFromTimedText.bind(this)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`[TRANSCRIPT] Trying method ${i + 1}`);
        const result = await methods[i](videoId, preferredLangs);
        
        if (result.text && result.text.trim().length > 0) {
          console.log(`[TRANSCRIPT] Success with method ${i + 1}: ${result.text.length} characters`);
          return result;
        }
      } catch (error) {
        console.warn(`[TRANSCRIPT] Method ${i + 1} failed:`, error.message);
        // Continue to next method
      }
    }

    console.error('[TRANSCRIPT] All methods failed');
    return {
      text: '',
      segments: [],
      reason: 'no_transcript_available_all_methods_failed'
    };
  }

  /**
   * Validate YouTube video ID format
   */
  private isValidVideoId(videoId: string): boolean {
    // YouTube video IDs are typically 11 characters
    return typeof videoId === 'string' && videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId);
  }

  /**
   * Method 1: YouTube Data API v3 captions
   */
  private async getTranscriptFromDataAPI(videoId: string, preferredLangs: string[]): Promise<TranscriptResult> {
    if (!this.isApiKeyValid) {
      throw new Error('YouTube API key not configured for Data API');
    }

    console.log(`[DATA_API] Starting for video: ${videoId}`);
    
    try {
      // First, get list of available captions
      const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${this.apiKey}`;
      
      console.log(`[DATA_API] Fetching captions list`);
      const captionsResponse = await fetch(captionsListUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!captionsResponse.ok) {
        const errorData = await captionsResponse.json();
        console.error(`[DATA_API] Captions list error: ${captionsResponse.status}`, errorData);
        
        if (captionsResponse.status === 403) {
          throw new Error('API key does not have permission to access captions');
        }
        if (captionsResponse.status === 404) {
          throw new Error('No captions available for this video');
        }
        throw new Error(`API error: ${captionsResponse.status}`);
      }

      const captionsData = await captionsResponse.json();
      console.log(`[DATA_API] Found ${captionsData.items?.length || 0} caption tracks`);

      if (!captionsData.items || captionsData.items.length === 0) {
        throw new Error('No caption tracks available');
      }

      // Log available languages for debugging
      const availableLangs = captionsData.items.map((item: any) => item.snippet.language);
      console.log(`[DATA_API] Available languages: ${availableLangs.join(', ')}`);

      // Find the best caption track
      let selectedCaption = this.selectBestCaptionTrack(captionsData.items, preferredLangs);
      
      if (!selectedCaption) {
        throw new Error('No suitable caption track found');
      }

      console.log(`[DATA_API] Selected caption: ${selectedCaption.snippet.language}`);
      
      // Download the caption content
      const captionUrl = `https://www.googleapis.com/youtube/v3/captions/${selectedCaption.id}?key=${this.apiKey}&tfmt=json`;
      
      const captionResponse = await fetch(captionUrl, {
        signal: AbortSignal.timeout(15000)
      });

      if (!captionResponse.ok) {
        throw new Error(`Caption download failed: ${captionResponse.status}`);
      }

      const captionContent = await captionResponse.text();
      const result = this.parseTranscriptContent(captionContent);
      
      if (!result.text || result.text.trim().length === 0) {
        throw new Error('Empty transcript content');
      }

      return result;

    } catch (error) {
      console.error('[DATA_API] Failed:', error.message);
      throw error;
    }
  }

  /**
   * Select the best caption track based on preferred languages
   */
  private selectBestCaptionTrack(captions: any[], preferredLangs: string[]): any {
    // First try exact language matches
    for (const lang of preferredLangs) {
      const exactMatch = captions.find(caption => caption.snippet.language === lang);
      if (exactMatch) return exactMatch;
    }

    // Then try language family matches (e.g., en-US for en)
    for (const lang of preferredLangs) {
      const familyMatch = captions.find(caption => 
        caption.snippet.language.startsWith(lang + '-')
      );
      if (familyMatch) return familyMatch;
    }

    // Then try any available caption
    return captions.find(caption => caption.snippet.language) || captions[0];
  }

  /**
   * Method 2: Unofficial YouTube transcript API
   */
  private async getTranscriptFromUnofficial(videoId: string, preferredLangs: string[]): Promise<TranscriptResult> {
    console.log(`[UNOFFICIAL] Trying unofficial endpoints for: ${videoId}`);
    
    const endpoints = [
      `https://yt-api.easyapi.dev/transcript?video_id=${videoId}&lang=${preferredLangs[0]}`,
      `https://youtube-transcript.vercel.app/api/transcript?videoId=${videoId}`,
      `https://yt-transcript-api.herokuapp.com/transcript?video_id=${videoId}`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`[UNOFFICIAL] Trying endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          signal: AbortSignal.timeout(10000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn(`[UNOFFICIAL] Endpoint ${endpoint} returned ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (data.transcript || data.segments || data.text) {
          const segments = data.transcript || data.segments || [];
          const text = data.text || segments.map((seg: any) => seg.text || seg.content || '').join(' ');
          
          if (text && text.trim().length > 0) {
            console.log(`[UNOFFICIAL] Success from ${endpoint}: ${text.length} chars`);
            
            return {
              text: text.trim(),
              segments: segments.map((seg: any) => ({
                start: seg.start || seg.offset || 0,
                end: seg.end || (seg.start + seg.duration) || 0,
                text: seg.text || seg.content || ''
              }))
            };
          }
        }
      } catch (error) {
        console.warn(`[UNOFFICIAL] Endpoint ${endpoint} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All unofficial endpoints failed');
  }

  /**
   * Method 3: Direct timedtext endpoint access
   */
  private async getTranscriptFromTimedText(videoId: string, preferredLangs: string[]): Promise<TranscriptResult> {
    console.log(`[TIMEDTEXT] Trying timedtext for: ${videoId}`);
    
    try {
      // First get the watch page to extract player response
      const playerUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      const response = await fetch(playerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch player page: ${response.status}`);
      }

      const html = await response.text();
      
      // Try to extract player response from different patterns
      const patterns = [
        /var ytInitialPlayerResponse\s*=\s*({.+?});/,
        /ytInitialPlayerResponse\s*=\s*({.+?});/,
        /"playerResponse":"({.+?})"/
      ];

      let playerResponse: any = null;
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            playerResponse = JSON.parse(match[1].replace(/\\"/g, '"'));
            break;
          } catch (e) {
            console.warn('[TIMEDTEXT] Failed to parse player response with pattern:', pattern);
          }
        }
      }

      if (!playerResponse) {
        throw new Error('Could not extract player response');
      }

      const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      if (!captionTracks || captionTracks.length === 0) {
        throw new Error('No caption tracks found in player response');
      }

      console.log(`[TIMEDTEXT] Found ${captionTracks.length} caption tracks`);
      
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

      console.log(`[TIMEDTEXT] Selected track: ${selectedTrack.languageCode}`);
      
      // Fetch the actual transcript
      const transcriptResponse = await fetch(selectedTrack.baseUrl, {
        signal: AbortSignal.timeout(10000)
      });

      if (!transcriptResponse.ok) {
        throw new Error(`Transcript fetch failed: ${transcriptResponse.status}`);
      }

      const transcriptXml = await transcriptResponse.text();
      const result = this.parseTranscriptXML(transcriptXml);
      
      if (!result.text || result.text.trim().length === 0) {
        throw new Error('Empty transcript from timedtext');
      }

      console.log(`[TIMEDTEXT] Success: ${result.text.length} chars`);
      return result;

    } catch (error) {
      console.error('[TIMEDTEXT] Failed:', error.message);
      throw error;
    }
  }

  /**
   * Parse transcript content (handles various formats)
   */
  private parseTranscriptContent(content: string): TranscriptResult {
    // Try to parse as XML first
    if (content.trim().startsWith('<?xml') || content.trim().startsWith('<transcript')) {
      return this.parseTranscriptXML(content);
    }

    // Try to parse as JSON
    try {
      const json = JSON.parse(content);
      return this.parseTranscriptJSON(json);
    } catch {
      // Not JSON, continue
    }

    // Treat as plain text
    const text = content.trim();
    if (text.length === 0) {
      throw new Error('Empty transcript content');
    }

    return {
      text: text,
      segments: []
    };
  }

  /**
   * Parse JSON transcript format
   */
  private parseTranscriptJSON(json: any): TranscriptResult {
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
    } else if (json.text) {
      return {
        text: json.text,
        segments: json.segments || []
      };
    }

    throw new Error('Unsupported JSON transcript format');
  }

  /**
   * Parse YouTube transcript XML format
   */
  private parseTranscriptXML(xml: string): TranscriptResult {
    const segments: Array<{ start: number; end: number; text: string }> = [];
    
    // Simple XML parsing using regex (could be improved with DOMParser)
    const textRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"(?:\s+[^>]*)?>([^<]*)<\/text>/g;
    let match;

    while ((match = textRegex.exec(xml)) !== null) {
      const start = parseFloat(match[1]);
      const duration = parseFloat(match[2]);
      const text = this.decodeXMLEntities(match[3]);

      segments.push({
        start,
        end: start + duration,
        text
      });
    }

    if (segments.length === 0) {
      throw new Error('No segments found in XML transcript');
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