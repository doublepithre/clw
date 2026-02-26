import { query } from '../config/database.js';
import type { DashboardStats } from '../types/index.js';

export async function getDashboardStats(orgId: string): Promise<DashboardStats> {
  const [candidates, searches, jobs, shortlists, statusCounts] = await Promise.all([
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM candidates WHERE org_id = $1',
      [orgId]
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM search_queries WHERE org_id = $1',
      [orgId]
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM job_descriptions WHERE org_id = $1',
      [orgId]
    ),
    query<{ count: string }>(
      'SELECT COUNT(*) as count FROM shortlists WHERE org_id = $1',
      [orgId]
    ),
    query<{ processing_status: string; count: string }>(
      `SELECT processing_status, COUNT(*) as count
       FROM candidates WHERE org_id = $1
       GROUP BY processing_status`,
      [orgId]
    ),
  ]);

  const statusMap = new Map(
    statusCounts.rows.map((r) => [r.processing_status, parseInt(r.count)])
  );

  return {
    totalCandidates: parseInt(candidates.rows[0].count),
    totalSearches: parseInt(searches.rows[0].count),
    totalJobs: parseInt(jobs.rows[0].count),
    totalShortlists: parseInt(shortlists.rows[0].count),
    readyCandidates: statusMap.get('ready') || 0,
    processingCandidates:
      (statusMap.get('pending') || 0) +
      (statusMap.get('extracting') || 0) +
      (statusMap.get('embedding') || 0),
    failedCandidates: statusMap.get('failed') || 0,
  };
}

export async function getSearchHistory(orgId: string, limit = 20) {
  const result = await query(
    `SELECT sq.*, u.name as user_name
     FROM search_queries sq
     LEFT JOIN users u ON u.id = sq.user_id
     WHERE sq.org_id = $1
     ORDER BY sq.created_at DESC
     LIMIT $2`,
    [orgId, limit]
  );
  return result.rows;
}

export async function getRecentUploads(orgId: string, limit = 20) {
  const result = await query(
    `SELECT id, resume_file_name as "fileName", name as "candidateName",
            processing_status as status, created_at as "createdAt"
     FROM candidates
     WHERE org_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [orgId, limit]
  );
  return result.rows;
}
