import { env } from '../config/env.js';

const VERTEX_AI_BASE = `https://${env.VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.GCP_PROJECT_ID}/locations/${env.VERTEX_AI_LOCATION}/publishers/google/models`;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${VERTEX_AI_BASE}/${env.EMBEDDING_MODEL}:predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ content: text }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${error}`);
  }

  const data = await response.json() as { predictions: { embeddings: { values: number[] } }[] };
  return data.predictions[0].embeddings.values;
}

export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
  // Vertex AI supports up to 250 texts per batch
  const batchSize = 250;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await fetch(`${VERTEX_AI_BASE}/${env.EMBEDDING_MODEL}:predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: batch.map((text) => ({ content: text })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${response.status} ${error}`);
    }

    const data = await response.json() as { predictions: { embeddings: { values: number[] } }[] };
    const embeddings = data.predictions.map(
      (p: { embeddings: { values: number[] } }) => p.embeddings.values
    );
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

export function buildEmbeddingText(
  summary: string,
  title: string | null,
  skills: string[],
  highlights: string[]
): string {
  const parts = [summary];
  if (title) parts.push(`Current Role: ${title}`);
  if (skills.length > 0) parts.push(`Skills: ${skills.join(', ')}`);
  if (highlights.length > 0) parts.push(`Key Achievements: ${highlights.join('. ')}`);
  return parts.join('\n');
}
