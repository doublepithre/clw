import 'dotenv/config';
import { createParseWorker } from './parse.worker.js';
import { createExtractWorker } from './extract.worker.js';
import { createEmbedWorker } from './embed.worker.js';

console.log('Starting ResumeAI workers...');

const parseWorker = createParseWorker();
const extractWorker = createExtractWorker();
const embedWorker = createEmbedWorker();

console.log('All workers started:');
console.log('  - Parse Worker (resume-processing) - concurrency: 3');
console.log('  - Extract Worker (resume-extraction) - concurrency: 2');
console.log('  - Embed Worker (resume-embedding) - concurrency: 5');

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down workers...`);
  await Promise.all([
    parseWorker.close(),
    extractWorker.close(),
    embedWorker.close(),
  ]);
  console.log('All workers closed');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in worker:', reason);
});
