import crypto from 'crypto';
import { query } from '../config/database.js';
import { NotFoundError } from '../middleware/error-handler.js';
import type { Shortlist, ShortlistCandidate } from '../types/index.js';

export async function createShortlist(
  orgId: string,
  createdBy: string,
  name: string,
  jobId?: string
): Promise<Shortlist> {
  const result = await query<Shortlist>(
    `INSERT INTO shortlists (org_id, created_by, name, job_id, share_token)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [orgId, createdBy, name, jobId || null, crypto.randomBytes(32).toString('hex')]
  );
  return result.rows[0];
}

export async function listShortlists(orgId: string): Promise<(Shortlist & { candidate_count: number })[]> {
  const result = await query<Shortlist & { candidate_count: number }>(
    `SELECT s.*, COUNT(sc.id)::int as candidate_count
     FROM shortlists s
     LEFT JOIN shortlist_candidates sc ON sc.shortlist_id = s.id
     WHERE s.org_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [orgId]
  );
  return result.rows;
}

export async function getShortlistById(
  id: string,
  orgId: string
): Promise<Shortlist & { candidates: (ShortlistCandidate & { candidate_name: string; candidate_title: string })[] }> {
  const slResult = await query<Shortlist>(
    'SELECT * FROM shortlists WHERE id = $1 AND org_id = $2',
    [id, orgId]
  );
  if (slResult.rows.length === 0) {
    throw new NotFoundError('Shortlist');
  }

  const candidatesResult = await query<ShortlistCandidate & { candidate_name: string; candidate_title: string }>(
    `SELECT sc.*, c.name as candidate_name, c.current_title as candidate_title
     FROM shortlist_candidates sc
     JOIN candidates c ON c.id = sc.candidate_id
     WHERE sc.shortlist_id = $1
     ORDER BY sc.rank ASC NULLS LAST, sc.match_score DESC NULLS LAST`,
    [id]
  );

  return {
    ...slResult.rows[0],
    candidates: candidatesResult.rows,
  };
}

export async function addCandidateToShortlist(
  shortlistId: string,
  candidateId: string,
  data: {
    rank?: number;
    matchScore?: number;
    matchReasoning?: string;
    strengths?: string[];
    gaps?: string[];
  }
): Promise<ShortlistCandidate> {
  const result = await query<ShortlistCandidate>(
    `INSERT INTO shortlist_candidates (shortlist_id, candidate_id, rank, match_score, match_reasoning, strengths, gaps)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      shortlistId,
      candidateId,
      data.rank || null,
      data.matchScore || null,
      data.matchReasoning || null,
      data.strengths || [],
      data.gaps || [],
    ]
  );
  return result.rows[0];
}

export async function updateShortlistSharing(
  id: string,
  orgId: string,
  shareEnabled: boolean
): Promise<Shortlist> {
  const result = await query<Shortlist>(
    `UPDATE shortlists SET share_enabled = $1, updated_at = NOW()
     WHERE id = $2 AND org_id = $3
     RETURNING *`,
    [shareEnabled, id, orgId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Shortlist');
  }
  return result.rows[0];
}

export async function getSharedShortlist(
  shareToken: string
): Promise<Shortlist & { candidates: (ShortlistCandidate & { candidate_name: string; candidate_title: string })[] } | null> {
  const slResult = await query<Shortlist>(
    'SELECT * FROM shortlists WHERE share_token = $1 AND share_enabled = TRUE',
    [shareToken]
  );
  if (slResult.rows.length === 0) return null;

  const candidatesResult = await query<ShortlistCandidate & { candidate_name: string; candidate_title: string }>(
    `SELECT sc.*, c.name as candidate_name, c.current_title as candidate_title
     FROM shortlist_candidates sc
     JOIN candidates c ON c.id = sc.candidate_id
     WHERE sc.shortlist_id = $1
     ORDER BY sc.rank ASC NULLS LAST, sc.match_score DESC NULLS LAST`,
    [slResult.rows[0].id]
  );

  return { ...slResult.rows[0], candidates: candidatesResult.rows };
}

export async function updateShortlistCandidate(
  shortlistId: string,
  candidateId: string,
  orgId: string,
  data: { status?: string; reviewerNotes?: string }
): Promise<ShortlistCandidate> {
  // Verify ownership
  const ownership = await query(
    'SELECT id FROM shortlists WHERE id = $1 AND org_id = $2',
    [shortlistId, orgId]
  );
  if (ownership.rows.length === 0) {
    throw new NotFoundError('Shortlist');
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.reviewerNotes !== undefined) {
    fields.push(`reviewer_notes = $${paramIndex++}`);
    values.push(data.reviewerNotes);
  }

  values.push(shortlistId, candidateId);
  const result = await query<ShortlistCandidate>(
    `UPDATE shortlist_candidates SET ${fields.join(', ')}
     WHERE shortlist_id = $${paramIndex++} AND candidate_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Shortlist candidate');
  }
  return result.rows[0];
}
