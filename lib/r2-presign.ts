import { AwsClient } from 'aws4fetch';
import type { CloudflareEnv } from './cloudflare';

const DEFAULT_EXPIRY_SECONDS = 12 * 60 * 60;

export function publicR2ObjectUrl(publicOrigin: string, key: string): string {
  if (!key || key.startsWith('/') || key.includes('..')) {
    throw new Error('Invalid R2 object key');
  }
  const base = publicOrigin.replace(/\/+$/, '');
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function objectUrl(endpoint: string, bucket: string, key: string): URL {
  const base = endpoint.replace(/\/+$/, '');
  const path = [bucket, ...key.split('/')].map(encodeURIComponent).join('/');
  return new URL(`${base}/${path}`);
}

export async function presignParticipantR2Object(
  env: Pick<
    CloudflareEnv,
    | 'PRIVATE_R2_ACCESS_KEY_ID'
    | 'PRIVATE_R2_SECRET_ACCESS_KEY'
    | 'PRIVATE_R2_ENDPOINT_URL'
    | 'PRIVATE_R2_BUCKET_NAME'
  >,
  key: string,
  expiresSeconds = DEFAULT_EXPIRY_SECONDS,
): Promise<string> {
  if (!key || key.startsWith('/') || key.includes('..')) {
    throw new Error('Invalid R2 object key');
  }
  const normalizedKey = `/${key.toLowerCase()}`;
  if (
    normalizedKey.includes('/private/')
    || normalizedKey.endsWith('/answer_key.json')
    || normalizedKey.endsWith('/scoring_policy.json')
  ) {
    throw new Error('Private assessment contracts cannot be presigned');
  }
  const url = objectUrl(
    env.PRIVATE_R2_ENDPOINT_URL,
    env.PRIVATE_R2_BUCKET_NAME,
    key,
  );
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds));
  const client = new AwsClient({
    accessKeyId: env.PRIVATE_R2_ACCESS_KEY_ID,
    secretAccessKey: env.PRIVATE_R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
  const request = await client.sign(url.toString(), {
    method: 'GET',
    aws: { signQuery: true, service: 's3', region: 'auto' },
  });
  return request.url;
}
