import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface CloudflareEnv {
  DB: D1Database;
  PRACTICE_ASSETS: R2Bucket;
  PRACTICE_R2_PUBLIC_URL: string;
  PRIVATE_ASSETS: R2Bucket;
  PRIVATE_R2_ACCESS_KEY_ID: string;
  PRIVATE_R2_SECRET_ACCESS_KEY: string;
  PRIVATE_R2_ENDPOINT_URL: string;
  PRIVATE_R2_BUCKET_NAME: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  MICROSOFT_TENANT_ID?: string;
  POSTMARK_SERVER_TOKEN: string;
  POSTMARK_FROM_EMAIL: string;
  POSTMARK_WEBHOOK_SECRET: string;
}

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as CloudflareEnv;
}
