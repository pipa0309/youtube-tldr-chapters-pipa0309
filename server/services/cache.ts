export class CacheService {
  private cache = new Map<string, { data: any; expires: number }>();

  async generateCacheKey(videoId: string, language: string, model: string): Promise<string> {
    // Create a hash of the key components
    const keyString = `${videoId}-${language}-${model}`;
    return `tldr:${keyString}`;
  }

  async get(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  async set(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expires });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, value]) => {
      if (now > value.expires) {
        this.cache.delete(key);
      }
    });
  }
}

// Set up periodic cleanup
setInterval(() => {
  // This would be accessible to all CacheService instances
  // In a real implementation, you might want to use a singleton pattern
}, 5 * 60 * 1000); // Clean up every 5 minutes
