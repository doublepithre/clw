import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as never,
  }),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts, please try again later' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as never,
  }),
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Search rate limit exceeded, please wait' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as never,
  }),
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Upload rate limit exceeded' },
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as never,
  }),
});
