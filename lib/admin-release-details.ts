export interface AdminReleaseDetails {
  id: string;
  releaseId: string;
  exercise: 'typing' | 'assembly' | 'hybrid' | 'outbreak';
  mode: 'practice' | 'challenge';
  schemaVersion: string;
  publishedAt: string | null;
  roundId: string | null;
  roundTitle: string | null;
  manifestKey: string;
  answerKey: string;
  privatePrefix: string;
}

export interface AdminPrivateFile {
  id: string;
  relativePath: string;
  size: number;
  uploadedAt: string;
}

export async function getAdminReleaseDetails(
  db: D1Database,
  id: string,
): Promise<AdminReleaseDetails | null> {
  const row = await db.prepare(
    `SELECT d.id, d.release_id, d.exercise, d.mode, d.schema_version,
            d.published_at, d.round_id, d.manifest_key, d.answer_key,
            r.title AS round_title
       FROM dataset_release d
       LEFT JOIN assessment_round r ON r.id = d.round_id
      WHERE d.id = ? AND d.published_at IS NOT NULL`,
  )
    .bind(id)
    .first<Record<string, unknown>>();
  if (!row) return null;

  const manifestKey = String(row.manifest_key);
  const suffix = '/dataset_manifest.json';
  if (!manifestKey.endsWith(suffix)) {
    throw new Error(`Registered release ${id} has an invalid manifest key`);
  }
  const releasePrefix = manifestKey.slice(0, -suffix.length);
  const privatePrefix = `${releasePrefix}/private/`;
  const answerKey = String(row.answer_key);
  if (answerKey !== `${privatePrefix}answer_key.json`) {
    throw new Error(`Registered release ${id} has an invalid answer-key path`);
  }

  return {
    id: String(row.id),
    releaseId: String(row.release_id),
    exercise: String(row.exercise) as AdminReleaseDetails['exercise'],
    mode: String(row.mode) as AdminReleaseDetails['mode'],
    schemaVersion: String(row.schema_version),
    publishedAt: row.published_at ? String(row.published_at) : null,
    roundId: row.round_id ? String(row.round_id) : null,
    roundTitle: row.round_title ? String(row.round_title) : null,
    manifestKey,
    answerKey,
    privatePrefix,
  };
}

export async function listAdminPrivateFiles(
  bucket: R2Bucket,
  release: AdminReleaseDetails,
): Promise<AdminPrivateFile[]> {
  const files: AdminPrivateFile[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: release.privatePrefix, cursor });
    for (const object of page.objects) {
      if (!object.key.startsWith(release.privatePrefix)) continue;
      const relativePath = object.key.slice(release.privatePrefix.length);
      if (!relativePath || relativePath.includes('..')) continue;
      files.push({
        id: await privateFileId(relativePath),
        relativePath,
        size: object.size,
        uploadedAt: object.uploaded.toISOString(),
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function findAdminPrivateFile(
  bucket: R2Bucket,
  release: AdminReleaseDetails,
  fileId: string,
): Promise<AdminPrivateFile | null> {
  if (!/^[a-f0-9]{32}$/.test(fileId)) return null;
  const files = await listAdminPrivateFiles(bucket, release);
  return files.find((file) => file.id === fileId) ?? null;
}

export async function privateFileId(relativePath: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(relativePath),
  );
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function safePrivateFileName(relativePath: string): string {
  const basename = relativePath.split('/').pop() || 'private-file';
  return basename.replace(/[^A-Za-z0-9._-]/g, '_') || 'private-file';
}

export function safePrivateContentType(relativePath: string): string {
  if (relativePath.toLowerCase().endsWith('.json')) {
    return 'application/json; charset=utf-8';
  }
  if (/\.(txt|csv|tsv|md|nwk|log)$/i.test(relativePath)) {
    return 'text/plain; charset=utf-8';
  }
  return 'application/octet-stream';
}
