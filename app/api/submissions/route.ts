import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireReleaseAccess, requireUser, safeFilename } from '@/lib/assessment';
import {
  scoreSubmission,
  type AnswerKey,
  type ScoringPolicy,
} from '@/lib/scoring';

const MAX_SUBMISSION_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const form = await request.formData();
    const releaseId = form.get('releaseId');
    const upload = form.get('file');
    if (typeof releaseId !== 'string' || !(upload instanceof File)) {
      return Response.json({ error: 'releaseId and CSV file are required' }, { status: 400 });
    }
    if (upload.size === 0 || upload.size > MAX_SUBMISSION_BYTES) {
      return Response.json({ error: 'CSV must be between 1 byte and 10 MiB' }, { status: 400 });
    }
    const release = await requireReleaseAccess(env, releaseId, user.id, 'submit');
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM submission
        WHERE user_id = ? AND submitted_at >= datetime('now', '-10 minutes')`,
    )
      .bind(user.id)
      .first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= 10) {
      return Response.json(
        { error: 'Submission limit reached; try again in a few minutes' },
        { status: 429, headers: { 'retry-after': '600' } },
      );
    }
    const bytes = await upload.arrayBuffer();
    const csvText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const answerObject = await env.PRIVATE_ASSETS.get(release.answerKey);
    if (!answerObject) {
      throw new Error(`Private answer key is missing for release ${release.id}`);
    }
    const answerKey = (await answerObject.json()) as AnswerKey;
    const policyKey = release.answerKey.replace(/answer_key\.json$/, 'scoring_policy.json');
    const policyObject = await env.PRIVATE_ASSETS.get(policyKey);
    const policy = policyObject
      ? ((await policyObject.json()) as ScoringPolicy)
      : undefined;
    if (policy && policy.release_id !== answerKey.release_id) {
      throw new Error(`Scoring policy does not match release ${release.id}`);
    }
    const score = scoreSubmission(csvText, answerKey, policy);
    const submissionId = crypto.randomUUID();
    const scoreId = crypto.randomUUID();
    const filename = safeFilename(upload.name);
    const objectKey = `submissions/${release.id}/${user.id}/${submissionId}/${filename}`;
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const attempt = await env.DB.prepare(
      'SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM submission WHERE release_id = ? AND user_id = ?',
    )
      .bind(release.id, user.id)
      .first<{ next_attempt: number }>();
    await env.PRIVATE_ASSETS.put(objectKey, bytes, {
      httpMetadata: { contentType: 'text/csv' },
      customMetadata: { sha256: digest, userId: user.id, releaseId: release.id },
    });
    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO submission
             (id, release_id, user_id, attempt_number, object_key, original_filename,
              sha256, size_bytes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scored')`,
        ).bind(
          submissionId,
          release.id,
          user.id,
          Number(attempt?.next_attempt ?? 1),
          objectKey,
          filename,
          digest,
          upload.size,
        ),
        env.DB.prepare(
          `INSERT INTO score
             (id, submission_id, scorer_version, earned, possible, passed, provisional, details_json)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        ).bind(
          scoreId,
          submissionId,
          policy?.scorer_version ?? 'exact-v1',
          score.earned,
          score.possible,
          score.passed ? 1 : 0,
          JSON.stringify(score),
        ),
        env.DB.prepare(
          `INSERT INTO audit_event (id, actor_user_id, action, target_type, target_id, after_json)
           VALUES (?, ?, 'submission.scored', 'submission', ?, ?)`,
        ).bind(
          crypto.randomUUID(),
          user.id,
          submissionId,
          JSON.stringify({ earned: score.earned, possible: score.possible, passed: score.passed }),
        ),
      ]);
    } catch (error) {
      await env.PRIVATE_ASSETS.delete(objectKey);
      throw error;
    }
    return Response.json({
      submissionId,
      status: 'scored',
      earned: score.earned,
      possible: score.possible,
      passed: score.passed,
      provisional: true,
      details: release.mode === 'practice' ? score : undefined,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const rows = await env.DB.prepare(
      `SELECT s.id, s.release_id, s.attempt_number, s.original_filename, s.submitted_at,
              s.status, sc.earned, sc.possible, sc.passed, sc.provisional,
              d.exercise, d.mode
         FROM submission s
         JOIN dataset_release d ON d.id = s.release_id
         LEFT JOIN score sc ON sc.submission_id = s.id
        WHERE s.user_id = ?
        ORDER BY s.submitted_at DESC`,
    )
      .bind(user.id)
      .all();
    return Response.json({ submissions: rows.results });
  } catch (error) {
    return jsonError(error);
  }
}
