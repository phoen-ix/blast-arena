import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../db/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function rateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const redis = getRedis();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `ratelimit:${ip}:${req.path}`;
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > config.maxRequests) {
        const ttl = await redis.ttl(key);
        res.set('Retry-After', String(ttl));
        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMITED',
          retryAfter: ttl,
        });
        return;
      }

      next();
    } catch {
      // If Redis fails, allow the request
      next();
    }
  };
}
