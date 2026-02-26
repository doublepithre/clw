import { query } from '../config/database.js';
import { generateEmbedding } from './embedding.service.js';
import { parseSearchQuery, rerankCandidates } from './llm.service.js';
import type { Candidate, ParsedSearchIntent, SearchResult, SearchResponse } from '../types/index.js';

export async function search(
  orgId: string,
  userId: string,
  queryText: string,
  limit = 20
): Promise<SearchResponse> {
  // Step 1: Query Understanding
  const parsedIntent = await parseSearchQuery(queryText);

  // Step 2: Generate query embedding
  const queryEmbedding = await generateEmbedding(parsedIntent.semanticQuery);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Step 3: Hybrid search (vector + metadata filters)
  const { sql, params } = buildHybridSearchQuery(orgId, vectorStr, parsedIntent, 200);
  const vectorResults = await query<Candidate & { similarity: number; vector_rank: number }>(sql, params);

  // Step 4: LLM Re-ranking for top 50
  const topCandidates = vectorResults.rows.slice(0, 50);
  let rankedResults: SearchResult[] = [];

  if (topCandidates.length > 0) {
    // Batch 10 candidates per LLM call
    const batchSize = 10;
    const batches: typeof topCandidates[] = [];
    for (let i = 0; i < topCandidates.length; i += batchSize) {
      batches.push(topCandidates.slice(i, i + batchSize));
    }

    const allRankings = await Promise.all(
      batches.map((batch) => {
        const summaries = batch.map((c) => ({
          id: c.id,
          summary: buildCandidateSummary(c),
        }));
        return rerankCandidates(queryText, parsedIntent, summaries);
      })
    );

    const flatRankings = allRankings.flat();
    const candidateMap = new Map(topCandidates.map((c) => [c.id, c]));

    rankedResults = flatRankings
      .filter((r) => candidateMap.has(r.id))
      .map((r) => ({
        candidate: candidateMap.get(r.id)!,
        matchScore: r.matchScore,
        reasoning: r.reasoning,
        strengths: r.strengths,
        gaps: r.gaps,
        evidence: r.evidence,
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  // Save search query
  await query(
    `INSERT INTO search_queries (org_id, user_id, query_text, parsed_intent, result_count)
     VALUES ($1, $2, $3, $4, $5)`,
    [orgId, userId, queryText, JSON.stringify(parsedIntent), rankedResults.length]
  );

  return {
    candidates: rankedResults,
    parsedQuery: parsedIntent,
    totalMatches: vectorResults.rowCount ?? 0,
  };
}

function buildHybridSearchQuery(
  orgId: string,
  vectorStr: string,
  intent: ParsedSearchIntent,
  limit: number
): { sql: string; params: unknown[] } {
  const conditions: string[] = ['c.org_id = $1', "c.processing_status = 'ready'"];
  const params: unknown[] = [orgId];
  let paramIndex = 2;

  // Metadata filters
  if (intent.filters.minExperienceYears) {
    conditions.push(`c.total_experience_years >= $${paramIndex}`);
    params.push(intent.filters.minExperienceYears);
    paramIndex++;
  }

  if (intent.filters.maxExperienceYears) {
    conditions.push(`c.total_experience_years <= $${paramIndex}`);
    params.push(intent.filters.maxExperienceYears);
    paramIndex++;
  }

  if (intent.filters.locationCity) {
    conditions.push(`c.location_city ILIKE $${paramIndex}`);
    params.push(`%${intent.filters.locationCity}%`);
    paramIndex++;
  }

  if (intent.filters.locationState) {
    conditions.push(`c.location_state ILIKE $${paramIndex}`);
    params.push(`%${intent.filters.locationState}%`);
    paramIndex++;
  }

  if (intent.filters.requiredSkills && intent.filters.requiredSkills.length > 0) {
    conditions.push(`c.skills @> $${paramIndex}`);
    params.push(intent.filters.requiredSkills);
    paramIndex++;
  }

  if (intent.filters.seniority) {
    conditions.push(`c.seniority_level = $${paramIndex}`);
    params.push(intent.filters.seniority);
    paramIndex++;
  }

  const where = conditions.join(' AND ');

  // Vector similarity with cosine distance
  const sql = `
    SELECT c.*,
           1 - (ce.embedding <=> $${paramIndex}::vector) as similarity,
           ROW_NUMBER() OVER (ORDER BY ce.embedding <=> $${paramIndex}::vector) as vector_rank
    FROM candidates c
    JOIN candidate_embeddings ce ON ce.candidate_id = c.id AND ce.embedding_type = 'primary'
    WHERE ${where}
    ORDER BY ce.embedding <=> $${paramIndex}::vector
    LIMIT $${paramIndex + 1}
  `;
  params.push(vectorStr, limit);

  return { sql, params };
}

function buildCandidateSummary(candidate: Candidate): string {
  const parts: string[] = [];
  if (candidate.name) parts.push(`Name: ${candidate.name}`);
  if (candidate.current_title) parts.push(`Title: ${candidate.current_title}`);
  if (candidate.current_company) parts.push(`Company: ${candidate.current_company}`);
  if (candidate.total_experience_years) parts.push(`Experience: ${candidate.total_experience_years} years`);
  if (candidate.location_city) parts.push(`Location: ${candidate.location_city}`);
  if (candidate.skills.length > 0) parts.push(`Skills: ${candidate.skills.join(', ')}`);
  if (candidate.summary) parts.push(`Summary: ${candidate.summary}`);
  return parts.join('\n');
}
