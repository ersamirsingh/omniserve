import { RedisClientType } from 'redis';
import connectRedis from "../../config/redis.js";

export class TokenBlacklistService {
  private static redisClient: RedisClientType | null = null;

  static async init(): Promise<void> {
    if (!this.redisClient) {
      this.redisClient = await connectRedis();
    }
  }

  static async addToBlacklist(token: string, expiresIn: number): Promise<void> {
    try {
      await this.init();

      await this.redisClient!.setEx(
        `blacklist:${token}`,
        expiresIn,
        JSON.stringify({
          blacklistedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        })
      );

    } catch (error) {
      console.error('Error adding token to blacklist:', error);
      throw error;
    }
  }

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

  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.init();

      const keys = await this.redisClient!.keys(`user_tokens:${userId}:*`);

      if (keys.length > 0) {
        await this.redisClient!.del(keys);
      }
    } catch (error) {
      console.error('Error revoking user tokens:', error);
      throw error;
    }
  }

  static async trackUserToken(
    userId: string,
    token: string,
    expiresIn: number
  ): Promise<void> {
    try {
      await this.init();

      const tokenKey = `user_tokens:${userId}:${Date.now()}`;

      await this.redisClient!.setEx(
        tokenKey,
        expiresIn,
        JSON.stringify({
          token: token.substring(0, 20),
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        })
      );
    } catch (error) {
      console.error('Error tracking user token:', error);

    }
  }

  static async clearBlacklist(): Promise<void> {
    try {
      await this.init();

      const keys = await this.redisClient!.keys('blacklist:*');

      if (keys.length > 0) {
        await this.redisClient!.del(keys);
      }
    } catch (error) {
      console.error('Error clearing blacklist:', error);
      throw error;
    }
  }

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

      return Math.max(1, secondsUntilExpiry);
    } catch (error) {
      console.error('Error extracting token expiration:', error);
      return 24 * 60 * 60;
    }
  }

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
