import { RedisClientType } from 'redis';
import connectRedis from '../config/redis.config.js';

export class TokenBlacklistService {
  private static redisClient: RedisClientType | null = null;

  /** Initialize Redis client */
  static async init(): Promise<void> {
    if (!this.redisClient) {
      this.redisClient = await connectRedis();
    }
  }

  /**  @param token - The JWT token to blacklist */
  static async addToBlacklist(token: string, expiresIn: number): Promise<void> {
    try {
      await this.init();

      // Set the token in Redis with expiration matching token TTL
      // This way, the key auto-expires when the token would expire anyway
      await this.redisClient!.setEx(
        `blacklist:${token}`,
        expiresIn,
        JSON.stringify({
          blacklistedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        })
      );

      console.log(`Token blacklisted for ${expiresIn} seconds`);
    } catch (error) {
      console.error('Error adding token to blacklist:', error);
      throw error;
    }
  }

  /** Check if token is blacklisted */
  static async isBlacklisted(token: string): Promise<boolean> {
    try {
      await this.init();

      const exists = await this.redisClient!.exists(`blacklist:${token}`);
      return exists === 1;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  /** Revoke all tokens for a user */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.init();

      // Get all keys matching the user's tokens pattern
      const keys = await this.redisClient!.keys(`user_tokens:${userId}:*`);

      if (keys.length > 0) {
        await this.redisClient!.del(keys);
        console.log(`Revoked ${keys.length} tokens for user ${userId}`);
      }
    } catch (error) {
      console.error('Error revoking user tokens:', error);
      throw error;
    }
  }

  /**
   * Add token to user's token list for tracking
   * @param userId - User ID
   * @param token - JWT token
   * @param expiresIn - Time in seconds when token expires
   */
  static async trackUserToken(
    userId: string,
    token: string,
    expiresIn: number
  ): Promise<void> {
    try {
      await this.init();

      // Create a unique key for this token under the user
      const tokenKey = `user_tokens:${userId}:${Date.now()}`;

      await this.redisClient!.setEx(
        tokenKey,
        expiresIn,
        JSON.stringify({
          token: token.substring(0, 20), // Store partial token for logging
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        })
      );
    } catch (error) {
      console.error('Error tracking user token:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Clear all blacklisted tokens (useful for cache cleanup)
   */
  static async clearBlacklist(): Promise<void> {
    try {
      await this.init();

      // Get all blacklisted token keys
      const keys = await this.redisClient!.keys('blacklist:*');

      if (keys.length > 0) {
        await this.redisClient!.del(keys);
        console.log(`Cleared ${keys.length} blacklisted tokens`);
      }
    } catch (error) {
      console.error('Error clearing blacklist:', error);
      throw error;
    }
  }

  /**
   * Get blacklist statistics
   */
  static async getBlacklistStats(): Promise<{
    totalBlacklisted: number;
    totalUserTokenTracked: number;
  }> {
    try {
      await this.init();

      const blacklistedKeys = await this.redisClient!.keys('blacklist:*');
      const userTokenKeys = await this.redisClient!.keys('user_tokens:*');

      return {
        totalBlacklisted: blacklistedKeys.length,
        totalUserTokenTracked: userTokenKeys.length,
      };
    } catch (error) {
      console.error('Error getting blacklist stats:', error);
      return { totalBlacklisted: 0, totalUserTokenTracked: 0 };
    }
  }

  /**
   * Extract expiration time from JWT token
   * @param token - JWT token
   * @returns Seconds until expiration
   */
  static getTokenExpirationTime(token: string): number {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }

      const payload = parts[1];
      const decodedStr = Buffer.from(payload as any, 'base64').toString('utf-8');
      const decoded = JSON.parse(decodedStr) as { exp?: number };

      if (!decoded.exp) {
        return Number(process.env.JWT_EXPIRY) || 24 * 60 * 60;
      }

      const expiresAt = decoded.exp * 1000;
      const now = Date.now();
      const secondsUntilExpiry = Math.ceil((expiresAt - now) / 1000);

      // Ensure at least 1 second
      return Math.max(1, secondsUntilExpiry);
    } catch (error) {
      console.error('Error extracting token expiration:', error);
      return 24 * 60 * 60;
    }
  }

  /** Perform health check on Redis connection */
  static async healthCheck(): Promise<boolean> {
    try {
      await this.init();
      const response = await this.redisClient!.ping();
      return response === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}
