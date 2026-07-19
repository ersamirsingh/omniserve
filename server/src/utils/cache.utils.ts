import { isRedisReady, getRedisClient } from "../config/redis.js";

export class CacheUtils {
  /** Synchronously returns the client if ready, otherwise null */
  private static getClient() {
    if (!isRedisReady()) return null;
    return getRedisClient();
  }

  /**
   * Fetch parsed data from Redis by key
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.getClient();
      if (!client) return null;
      
      const val = await client.get(key);
      if (!val) return null;
      
      return JSON.parse(val) as T;
    } catch (err) {
      console.error(`[CacheUtils] Error getting key ${key}:`, err);
      return null;
    }
  }

  /**
   * Set JSON serialized data in Redis with optional TTL (in seconds)
   */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      
      const payload = JSON.stringify(value);
      if (ttlSeconds) {
        await client.set(key, payload, { EX: ttlSeconds });
      } else {
        await client.set(key, payload);
      }
    } catch (err) {
      console.error(`[CacheUtils] Error setting key ${key}:`, err);
    }
  }

  /**
   * Delete a single key from Redis
   */
  static async del(key: string): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;
      
      await client.del(key);
    } catch (err) {
      console.error(`[CacheUtils] Error deleting key ${key}:`, err);
    }
  }

  /**
   * Evict all keys matching a wildcard pattern (e.g., cache:menu_items:tenant:*)
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const client = this.getClient();
      if (!client) return;

      let cursor = "0";
      do {
        const response = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = response.cursor;
        const keys = response.keys;
        if (keys && keys.length > 0) {
          await client.del(keys);
        }
      } while (cursor !== "0");
    } catch (err) {
      console.error(`[CacheUtils] Error evicting pattern ${pattern}:`, err);
    }
  }
}
