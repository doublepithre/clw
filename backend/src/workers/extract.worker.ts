import { Worker, type Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { extractResumeData } from '../services/llm.service.js';
import { updateCandidateData, storeCandidateSkills } from '../services/candidate.service.js';
import { embedQueue } from './queues.js';

interface ExtractJobData {
  candidateId: string;
  rawText: string;
}

async function processExtractJob(job: Job<ExtractJobData>) {
  const { candidateId, rawText } = job.data;

  console.log(`[Extract Worker] Processing candidate ${candidateId}`);

  // Call Gemini for structured extraction
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

  console.log(`[Extract Worker] Extraction complete for ${candidateId}`);
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
