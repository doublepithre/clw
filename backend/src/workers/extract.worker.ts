import { Worker, type Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { extractResumeData } from '../services/llm.service.js';
import { updateCandidateData, storeCandidateSkills } from '../services/candidate.service.js';
import { embedQueue } from './queues.js';

interface SectionMeta {
  heading: string;
  level: number;
}

interface ExtractionMeta {
  pages: number;
  fileType: string;
  hasTables: boolean;
  extractionTimeMs: number;
  ocrUsed: boolean;
}

interface ExtractJobData {
  candidateId: string;
  /** Structured markdown from Docling (with headings, sections, tables) */
  rawText: string;
  /** Section metadata detected by Docling */
  sections?: SectionMeta[];
  /** Number of tables detected */
  tables?: number;
  /** Extraction metadata */
  metadata?: ExtractionMeta;
}

async function processExtractJob(job: Job<ExtractJobData>) {
  const { candidateId, rawText, sections, metadata } = job.data;

  console.log(
    `[Extract Worker] Processing candidate ${candidateId} ` +
    `(${sections?.length ?? 0} sections, ${metadata?.pages ?? '?'} pages, ` +
    `format: ${metadata?.fileType ?? 'unknown'})`
  );

  // Call Gemini for structured extraction
  // The rawText here is structured markdown from Docling, not flat text.
  // This means Gemini sees clear section headings like "## Work Experience",
  // formatted tables, and proper reading order — dramatically improving accuracy.
  const extracted = await extractResumeData(rawText);

  // Update candidate with extracted data
  await updateCandidateData(candidateId, {
    name: (extracted as unknown as { name?: string }).name || null,
    email: (extracted as unknown as { email?: string }).email || null,
    phone: (extracted as unknown as { phone?: string }).phone || null,
    location_city: (extracted as unknown as { location?: { city?: string } }).location?.city || null,
    location_state: (extracted as unknown as { location?: { state?: string } }).location?.state || null,
    location_country: (extracted as unknown as { location?: { country?: string } }).location?.country || null,
    current_title: (extracted as unknown as { currentTitle?: string }).currentTitle || null,
    current_company: (extracted as unknown as { currentCompany?: string }).currentCompany || null,
    total_experience_years: (extracted as unknown as { totalExperienceYears?: number }).totalExperienceYears || null,
    seniority_level: (extracted as unknown as { seniorityLevel?: string }).seniorityLevel || null,
    summary: (extracted as unknown as { summary?: string }).summary || null,
    skills: extracted.skills?.map((s) => s.name) || [],
    extracted_data: extracted as unknown as Record<string, unknown>,
    processing_status: 'embedding',
  } as never);

  // Store normalized skills
  if (extracted.skills && extracted.skills.length > 0) {
    await storeCandidateSkills(
      candidateId,
      extracted.skills.map((s) => ({
        name: s.name,
        category: s.category,
        years: s.years,
        proficiency: s.proficiency,
      }))
    );
  }

  // Enqueue for embedding
  await embedQueue.add('embed', {
    candidateId,
    summary: extracted.resumeSummaryForEmbedding || (extracted as unknown as { summary?: string }).summary || '',
    title: (extracted as unknown as { currentTitle?: string }).currentTitle || '',
    skills: extracted.skills?.map((s) => s.name) || [],
    highlights: extracted.workExperience
      ?.flatMap((w) => w.highlights)
      .slice(0, 5) || [],
  });

  console.log(`[Extract Worker] LLM extraction complete for ${candidateId}`);
}

export function createExtractWorker() {
  const worker = new Worker('resume-extraction', processExtractJob, {
    connection: redis,
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    console.log(`[Extract Worker] Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[Extract Worker] Job ${job?.id} failed:`, err.message);
    if (job) {
      await updateCandidateData(job.data.candidateId, {
        processing_status: 'failed',
        processing_error: `LLM extraction failed: ${err.message}`,
      });
    }
  });

  return worker;
}
