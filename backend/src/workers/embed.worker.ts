import { Worker, type Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { generateEmbedding, buildEmbeddingText } from '../services/embedding.service.js';
import { updateCandidateData, storeEmbedding } from '../services/candidate.service.js';

interface EmbedJobData {
  candidateId: string;
  summary: string;
  title: string;
  skills: string[];
  highlights: string[];
}

async function processEmbedJob(job: Job<EmbedJobData>) {
  const { candidateId, summary, title, skills, highlights } = job.data;

  console.log(`[Embed Worker] Processing candidate ${candidateId}`);

  // Build embedding text
  const embeddingText = buildEmbeddingText(summary, title, skills, highlights);

  // Generate embedding via Vertex AI
  const embedding = await generateEmbedding(embeddingText);

  // Store embedding in pgvector
  await storeEmbedding(candidateId, embedding);

  // Mark as ready
  await updateCandidateData(candidateId, {
    processing_status: 'ready',
    processing_error: null,
  });

  console.log(`[Embed Worker] Embedding complete for ${candidateId} (${embedding.length} dims)`);
}

export function createEmbedWorker() {
  const worker = new Worker('resume-embedding', processEmbedJob, {
    connection: redis,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    console.log(`[Embed Worker] Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[Embed Worker] Job ${job?.id} failed:`, err.message);
    if (job) {
      await updateCandidateData(job.data.candidateId, {
        processing_status: 'failed',
        processing_error: `Embedding generation failed: ${err.message}`,
      });
    }
  });

  return worker;
}
