import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string(),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  SESSION_SECRET: z.string().min(32),

  GCP_PROJECT_ID: z.string(),
  GCP_REGION: z.string().default('asia-south1'),
  GCS_BUCKET_NAME: z.string(),

  VERTEX_AI_LOCATION: z.string().default('asia-south1'),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  EMBEDDING_MODEL: z.string().default('text-embedding-005'),

  EXTRACTION_SERVICE_URL: z.string().default('http://localhost:8100'),

  APP_URL: z.string().default('http://localhost:5173'),
  API_URL: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
