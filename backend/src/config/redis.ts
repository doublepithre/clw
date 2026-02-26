import Redis from 'ioredis';
import { env } from './env.js';

export const redis = new (Redis as unknown as typeof Redis.default)(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (err: Error) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});
