import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireReleaseAccess, requireUser, safeFilename } from '@/lib/assessment';
import { buildSubmissionReceipt } from '@/lib/submission-receipt';
import {
  detectDelimiter,
  scoreSubmission,
  SubmissionValidationError,
  type AnswerKey,
  type ScoringPolicy,
  validateSubmissionCompleteness,
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
      return Response.json(
        { error: 'A release and CSV or TSV result sheet are required' },
        { status: 400 },
      );
    }
    if (upload.size === 0 || upload.size > MAX_SUBMISSION_BYTES) {
      return Response.json(
        { error: 'Result sheet must be between 1 byte and 10 MiB' },
        { status: 400 },
      );
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
    let submissionText: string;
    try {
      submissionText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new SubmissionValidationError(
        'Result sheet must be UTF-8 encoded. Re-export it as UTF-8 CSV or TSV',
      );
    }
    const format = detectDelimiter(submissionText) === '\t' ? 'tsv' : 'csv';
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
    if (
      answerKey.release_id !== release.releaseId
      || answerKey.exercise !== release.exercise
      || answerKey.mode !== release.mode
    ) {
      throw new Error(`Private answer key does not match release ${release.id}`);
    }
    if (policy && policy.release_id !== release.releaseId) {
      throw new Error(`Scoring policy does not match release ${release.id}`);
    }
    const score = scoreSubmission(submissionText, answerKey, policy);
    validateSubmissionCompleteness(score, policy);
    const submissionId = crypto.randomUUID();
    const scoreId = crypto.randomUUID();
    const filename = safeFilename(upload.name, format);
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
      httpMetadata: {
        contentType:
          format === 'tsv'
            ? 'text/tab-separated-values; charset=utf-8'
            : 'text/csv; charset=utf-8',
      },
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
    return Response.json(buildSubmissionReceipt(release.mode, submissionId, score));
  } catch (error) {
    if (error instanceof SubmissionValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const rows = await env.DB.prepare(
      `SELECT s.id, s.release_id, s.attempt_number, s.original_filename, s.submitted_at,
              s.status,
              CASE
                WHEN d.mode = 'practice'
                  OR (r.answers_release_at IS NOT NULL
                    AND datetime('now') >= datetime(r.answers_release_at))
                THEN sc.earned
              END AS earned,
              CASE
                WHEN d.mode = 'practice'
                  OR (r.answers_release_at IS NOT NULL
                    AND datetime('now') >= datetime(r.answers_release_at))
                THEN sc.possible
              END AS possible,
              CASE
                WHEN d.mode = 'practice'
                  OR (r.answers_release_at IS NOT NULL
                    AND datetime('now') >= datetime(r.answers_release_at))
                THEN sc.passed
              END AS passed,
              sc.provisional,
              d.exercise, d.mode
         FROM submission s
         JOIN dataset_release d ON d.id = s.release_id
         LEFT JOIN assessment_round r ON r.id = d.round_id
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
