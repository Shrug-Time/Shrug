/**
 * Simple in-memory cache service for frequently accessed data
 */
export class CacheService {
  private static cache: Map<string, CacheEntry> = new Map();
  
  /**
   * Get a value from the cache
   * 
   * @param key Cache key
   * @returns Cached value or undefined if not found/expired
   */
  static get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value as T;
  }
  
  /**
   * Set a value in the cache
   * 
   * @param key Cache key
   * @param value Value to cache
   * @param ttlMs Time to live in milliseconds (optional)
   */
  static set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
    
    this.cache.set(key, {
      value,
      expiresAt
    });
  }
  
  /**
   * Remove a value from the cache
   * 
   * @param key Cache key
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cached values
   */
  static clear(): void {
    this.cache.clear();
  }
  
  /**
   * Clear cache entries that match a key pattern
   * 
   * @param pattern String or RegExp to match keys
   */
  static clearPattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get or set cache value with a factory function
   * 
   * @param key Cache key
   * @param factory Function to produce value if not in cache
   * @param ttlMs Time to live in milliseconds (optional)
   * @returns Cached or newly created value
   */
  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Generate new value
    const value = await factory();
    
    // Cache the result
    this.set(key, value, ttlMs);
    
    return value;
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * 
   * @param key Cache key
   * @returns True if the key exists and is not expired
   */
  static has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if entry has expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

/**
 * Interface for cache entries
 */
interface CacheEntry {
  value: any;
  expiresAt?: number;
} 