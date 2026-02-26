import 'dotenv/config';
import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { redis } from './config/redis.js';

const server = app.listen(env.PORT, () => {
  console.log(`ResumeAI API server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    redis.disconnect();
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
