import { query } from '../config/database.js';
import { NotFoundError } from '../middleware/error-handler.js';
import type { JobDescription } from '../types/index.js';

export async function createJob(
  orgId: string,
  createdBy: string,
  title: string,
  description: string
): Promise<JobDescription> {
  const result = await query<JobDescription>(
    `INSERT INTO job_descriptions (org_id, created_by, title, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [orgId, createdBy, title, description]
  );
  return result.rows[0];
}

export async function listJobs(orgId: string): Promise<JobDescription[]> {
  const result = await query<JobDescription>(
    'SELECT * FROM job_descriptions WHERE org_id = $1 ORDER BY created_at DESC',
    [orgId]
  );
  return result.rows;
}

export async function getJobById(id: string, orgId: string): Promise<JobDescription> {
  const result = await query<JobDescription>(
    'SELECT * FROM job_descriptions WHERE id = $1 AND org_id = $2',
    [id, orgId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Job description');
  }
  return result.rows[0];
}

export async function updateJob(
  id: string,
  orgId: string,
  data: { title?: string; description?: string; status?: string }
): Promise<JobDescription> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.title) {
    fields.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.description) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  fields.push('updated_at = NOW()');

  values.push(id, orgId);
  const result = await query<JobDescription>(
    `UPDATE job_descriptions SET ${fields.join(', ')}
     WHERE id = $${paramIndex++} AND org_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Job description');
  }
  return result.rows[0];
}

export async function deleteJob(id: string, orgId: string): Promise<void> {
  const result = await query(
    'DELETE FROM job_descriptions WHERE id = $1 AND org_id = $2',
    [id, orgId]
  );
  if (result.rowCount === 0) {
    throw new NotFoundError('Job description');
  }
}
