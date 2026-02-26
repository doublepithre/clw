import { Worker, type Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { bucket } from '../config/gcp.js';
import { extractText } from '../services/parsing.service.js';
import { updateCandidateData } from '../services/candidate.service.js';
import { extractQueue } from './queues.js';
import { query } from '../config/database.js';
import type { Candidate } from '../types/index.js';

interface ParseJobData {
  candidateId: string;
  orgId: string;
  fileName: string;
  mimeType: string;
}

async function processParseJob(job: Job<ParseJobData>) {
  const { candidateId, mimeType } = job.data;

  console.log(`[Parse Worker] Processing candidate ${candidateId}`);

  // Update status to extracting
  await updateCandidateData(candidateId, { processing_status: 'extracting' });

  // Get the GCS file URL from the candidate record
  const candidateResult = await query<Candidate>(
    'SELECT resume_file_url FROM candidates WHERE id = $1',
    [candidateId]
  );
  const gcsUrl = candidateResult.rows[0]?.resume_file_url;

  if (!gcsUrl) {
    throw new Error(`No resume file URL for candidate ${candidateId}`);
  }

  // Download file from GCS
  const gcsPath = gcsUrl.replace(`gs://${bucket.name}/`, '');
  const [buffer] = await bucket.file(gcsPath).download();

  // Extract text
  const rawText = await extractText(buffer, mimeType);

  if (!rawText || rawText.length < 50) {
    throw new Error('Extracted text is too short or empty');
  }

  // Save raw text
  await updateCandidateData(candidateId, { resume_raw_text: rawText });

  // Enqueue for LLM extraction
  await extractQueue.add('extract', {
    candidateId,
    rawText,
  });

  console.log(`[Parse Worker] Text extracted for ${candidateId} (${rawText.length} chars)`);
}

export function createParseWorker() {
  const worker = new Worker('resume-processing', processParseJob, {
    connection: redis,
    concurrency: 3,
  });

  worker.on('completed', (job) => {
    console.log(`[Parse Worker] Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[Parse Worker] Job ${job?.id} failed:`, err.message);
    if (job) {
      await updateCandidateData(job.data.candidateId, {
        processing_status: 'failed',
        processing_error: `Text extraction failed: ${err.message}`,
      });
    }
  });

  return worker;
}
