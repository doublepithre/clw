import { Worker, type Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { bucket } from '../config/gcp.js';
import { extractDocument } from '../services/parsing.service.js';
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
  const { candidateId, fileName, mimeType } = job.data;

  console.log(`[Parse Worker] Processing candidate ${candidateId} (${fileName})`);

  // Update status to extracting
  await updateCandidateData(candidateId, { processing_status: 'extracting' });

  // Get the GCS file URL from the candidate record
  const candidateResult = await query<Candidate>(
    'SELECT resume_file_url, resume_file_name FROM candidates WHERE id = $1',
    [candidateId]
  );
  const candidate = candidateResult.rows[0];

  if (!candidate?.resume_file_url) {
    throw new Error(`No resume file URL for candidate ${candidateId}`);
  }

  // Download file from GCS
  const gcsPath = candidate.resume_file_url.replace(`gs://${bucket.name}/`, '');
  const [buffer] = await bucket.file(gcsPath).download();

  // Extract using Docling Python microservice
  // Returns structured markdown with sections, tables, and metadata
  const extraction = await extractDocument(
    buffer,
    candidate.resume_file_name || fileName,
    mimeType
  );

  if (!extraction.markdown || extraction.markdown.length < 50) {
    throw new Error('Extracted content is too short or empty');
  }

  // Save both raw text and structured markdown
  await updateCandidateData(candidateId, { resume_raw_text: extraction.text });

  // Enqueue for LLM extraction — pass the structured markdown (not flat text)
  // because the markdown has sections, headings, and tables preserved,
  // which dramatically improves Gemini's extraction accuracy
  await extractQueue.add('extract', {
    candidateId,
    // Pass structured markdown to LLM — this is the key improvement
    // over flat text: Gemini sees "## Work Experience" headings,
    // formatted tables, and clear section boundaries
    rawText: extraction.markdown,
    // Also pass section metadata for additional context
    sections: extraction.sections.map((s) => ({
      heading: s.heading,
      level: s.level,
    })),
    tables: extraction.tables.length,
    metadata: {
      pages: extraction.metadata.pages,
      fileType: extraction.metadata.fileType,
      hasTables: extraction.metadata.hasTables,
      extractionTimeMs: extraction.metadata.extractionTimeMs,
      ocrUsed: extraction.metadata.ocrUsed,
    },
  });

  console.log(
    `[Parse Worker] Docling extraction complete for ${candidateId}: ` +
    `${extraction.markdown.length} chars, ${extraction.sections.length} sections, ` +
    `${extraction.tables.length} tables, ${extraction.metadata.extractionTimeMs}ms`
  );
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
        processing_error: `Document extraction failed: ${err.message}`,
      });
    }
  });

  return worker;
}
