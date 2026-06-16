export interface RateLimitOptions {
  interval: number; // in milliseconds
  uniqueTokenPerInterval: number;
}

export default function rateLimit(options: RateLimitOptions) {
  const tokenCache = new Map<string, number[]>();

  return {
    check: (limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const now = Date.now();
        const tokenCount = tokenCache.get(token) || [];
        
        // Remove old tokens
        const validTokens = tokenCount.filter((timestamp) => now - timestamp < options.interval);
        
        if (validTokens.length >= limit) {
          return reject('Rate limit exceeded');
        }

        validTokens.push(now);
        tokenCache.set(token, validTokens);
        
        // Cleanup map if it gets too large
        if (tokenCache.size > options.uniqueTokenPerInterval) {
          const keys = Array.from(tokenCache.keys());
          tokenCache.delete(keys[0]); // Remove oldest
        }

        return resolve();
      }),
  };
}
