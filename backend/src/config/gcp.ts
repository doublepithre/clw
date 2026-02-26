import { Storage } from '@google-cloud/storage';
import { env } from './env.js';

export const storage = new Storage({
  projectId: env.GCP_PROJECT_ID,
});

export const bucket = storage.bucket(env.GCS_BUCKET_NAME);

export async function uploadToGCS(
  filePath: string,
  destination: string,
  contentType: string
): Promise<string> {
  await bucket.upload(filePath, {
    destination,
    metadata: { contentType },
  });
  return `gs://${env.GCS_BUCKET_NAME}/${destination}`;
}

export async function uploadBufferToGCS(
  buffer: Buffer,
  destination: string,
  contentType: string
): Promise<string> {
  const file = bucket.file(destination);
  await file.save(buffer, { contentType });
  return `gs://${env.GCS_BUCKET_NAME}/${destination}`;
}

export async function getSignedUrl(
  filePath: string,
  expiresInMinutes = 60
): Promise<string> {
  const file = bucket.file(filePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}
