import crypto from 'crypto';
import { query } from '../config/database.js';
import { uploadBufferToGCS } from '../config/gcp.js';
import { NotFoundError, ConflictError } from '../middleware/error-handler.js';
import type { Candidate } from '../types/index.js';

interface ListOptions {
  orgId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export async function listCandidates(options: ListOptions): Promise<{
  candidates: Candidate[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const { orgId, page, pageSize, search, status } = options;
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['org_id = $1'];
  const params: unknown[] = [orgId];
  let paramIndex = 2;

  if (status && status !== 'all') {
    conditions.push(`processing_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (search) {
    conditions.push(
      `(name ILIKE $${paramIndex} OR current_title ILIKE $${paramIndex} OR current_company ILIKE $${paramIndex} OR $${paramIndex + 1} = ANY(skills))`
    );
    params.push(`%${search}%`, search);
    paramIndex += 2;
  }

  const where = conditions.join(' AND ');

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM candidates WHERE ${where}`,
    params
  );

  const result = await query<Candidate>(
    `SELECT * FROM candidates WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, pageSize, offset]
  );

  return {
    candidates: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    pageSize,
  };
}

export async function getCandidateById(id: string, orgId: string): Promise<Candidate> {
  const result = await query<Candidate>(
    'SELECT * FROM candidates WHERE id = $1 AND org_id = $2',
    [id, orgId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Candidate');
  }
  return result.rows[0];
}

export async function uploadResume(
  orgId: string,
  file: Express.Multer.File,
  source = 'upload'
): Promise<Candidate> {
  // Generate hash for dedup
  const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

  // Check for duplicate
  const existing = await query<Candidate>(
    'SELECT id FROM candidates WHERE org_id = $1 AND resume_file_hash = $2',
    [orgId, hash]
  );
  if (existing.rows.length > 0) {
    throw new ConflictError('This resume has already been uploaded');
  }

  // Upload to GCS
  const candidateId = crypto.randomUUID();
  const destination = `resumes/${orgId}/${candidateId}/${file.originalname}`;
  const gcsUrl = await uploadBufferToGCS(file.buffer, destination, file.mimetype);

  // Insert candidate record
  const result = await query<Candidate>(
    `INSERT INTO candidates (id, org_id, resume_file_url, resume_file_name, resume_file_hash, source, processing_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [candidateId, orgId, gcsUrl, file.originalname, hash, source]
  );

  return result.rows[0];
}

export async function updateCandidateData(
  id: string,
  data: Partial<Candidate>
): Promise<Candidate> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'name', 'email', 'phone', 'location_city', 'location_state', 'location_country',
    'current_title', 'current_company', 'total_experience_years', 'seniority_level',
    'summary', 'skills', 'extracted_data', 'resume_raw_text',
    'processing_status', 'processing_error',
  ] as const;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramIndex}`);
      values.push(field === 'skills' || field === 'extracted_data'
        ? (typeof data[field] === 'string' ? data[field] : JSON.stringify(data[field]))
        : data[field]
      );
      paramIndex++;
    }
  }

  if (fields.length === 0) return getCandidateById(id, '');

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<Candidate>(
    `UPDATE candidates SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Candidate');
  }

  return result.rows[0];
}

export async function deleteCandidate(id: string, orgId: string): Promise<void> {
  const result = await query(
    'DELETE FROM candidates WHERE id = $1 AND org_id = $2',
    [id, orgId]
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('Candidate');
  }
}

export async function updateCandidateTags(
  id: string,
  orgId: string,
  tags: string[]
): Promise<Candidate> {
  const result = await query<Candidate>(
    `UPDATE candidates SET tags = $1, updated_at = NOW()
     WHERE id = $2 AND org_id = $3
     RETURNING *`,
    [tags, id, orgId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Candidate');
  }
  return result.rows[0];
}

export async function storeEmbedding(
  candidateId: string,
  embedding: number[],
  embeddingType = 'primary'
): Promise<void> {
  const vectorStr = `[${embedding.join(',')}]`;
  await query(
    `INSERT INTO candidate_embeddings (candidate_id, embedding_type, embedding)
     VALUES ($1, $2, $3::vector)
     ON CONFLICT (candidate_id) WHERE embedding_type = 'primary'
     DO UPDATE SET embedding = $3::vector, created_at = NOW()`,
    [candidateId, embeddingType, vectorStr]
  );
}

export async function storeCandidateSkills(
  candidateId: string,
  skills: { name: string; category: string; years: number | null; proficiency: string | null }[]
): Promise<void> {
  // Clear existing skills
  await query('DELETE FROM candidate_skills WHERE candidate_id = $1', [candidateId]);

  if (skills.length === 0) return;

  const values: unknown[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;

  for (const skill of skills) {
    placeholders.push(
      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`
    );
    values.push(candidateId, skill.name, skill.category, skill.years, skill.proficiency);
    paramIndex += 5;
  }

  await query(
    `INSERT INTO candidate_skills (candidate_id, skill_name, skill_category, years, proficiency)
     VALUES ${placeholders.join(', ')}`,
    values
  );
}
