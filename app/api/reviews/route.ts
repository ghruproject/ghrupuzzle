import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import { parseDelimitedText } from '@/lib/scoring';

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    await requireRole(env.DB, user, ['reviewer', 'administrator']);
    const rows = await env.DB.prepare(
      `SELECT r.id, r.submission_id, r.reason, r.status, r.created_at,
              u.name AS participant_name, u.email AS participant_email,
              d.exercise, d.release_id, s.attempt_number, s.user_id, s.release_id,
              s.object_key, s.original_filename, s.structural_errors_json,
              sc.earned, sc.possible, sc.passed, sc.details_json
         FROM review r
         JOIN submission s ON s.id = r.submission_id
         JOIN user u ON u.id = s.user_id
         JOIN dataset_release d ON d.id = s.release_id
         JOIN score sc ON sc.submission_id = s.id
        WHERE r.status IN ('requested', 'in_review')
        ORDER BY r.created_at`,
    ).all<Record<string, unknown>>();
    const reviews = await Promise.all(rows.results.map(async (row) => {
      const object = await env.PRIVATE_ASSETS.get(String(row.object_key));
      let parsedRows: Array<Record<string, string>> = [];
      const parsingWarnings: string[] = JSON.parse(
        String(row.structural_errors_json ?? '[]'),
      ) as string[];
      if (!object) {
        parsingWarnings.push('Stored submission file is unavailable.');
      } else {
        try {
          parsedRows = parseDelimitedText(await object.text());
        } catch (error) {
          parsingWarnings.push(
            error instanceof Error ? error.message : 'Stored submission could not be parsed.',
          );
        }
      }
      const previous = await env.DB.prepare(
        `SELECT s.id, s.attempt_number, s.original_filename, s.submitted_at, s.status,
                sc.earned, sc.possible, sc.passed, sc.provisional,
                rv.status AS review_status, rv.resolution, rv.score_before_json,
                rv.score_after_json, rv.created_at AS review_created_at,
                rv.resolved_at
           FROM submission s
           LEFT JOIN score sc ON sc.submission_id = s.id
           LEFT JOIN review rv ON rv.submission_id = s.id
          WHERE s.user_id = ? AND s.release_id = ? AND s.id <> ?
          ORDER BY s.attempt_number DESC, rv.created_at DESC`,
      )
        .bind(row.user_id, row.release_id, row.submission_id)
        .all<Record<string, unknown>>();
      const audit = await env.DB.prepare(
        `SELECT action, actor_user_id, before_json, after_json, created_at
           FROM audit_event
          WHERE (target_type = 'review' AND target_id = ?)
             OR (target_type = 'submission' AND target_id = ?)
          ORDER BY created_at`,
      )
        .bind(row.id, row.submission_id)
        .all<Record<string, unknown>>();
      return {
        ...row,
        object_key: undefined,
        structural_errors_json: undefined,
        user_id: undefined,
        details_json: undefined,
        details: JSON.parse(String(row.details_json)),
        parsedRows,
        parsingWarnings,
        previousSubmissions: previous.results.map((item) => ({
          ...item,
          score_before: item.score_before_json
            ? JSON.parse(String(item.score_before_json))
            : null,
          score_after: item.score_after_json
            ? JSON.parse(String(item.score_after_json))
            : null,
          score_before_json: undefined,
          score_after_json: undefined,
        })),
        auditTrail: audit.results.map((item) => ({
          ...item,
          before: item.before_json ? JSON.parse(String(item.before_json)) : null,
          after: item.after_json ? JSON.parse(String(item.after_json)) : null,
          before_json: undefined,
          after_json: undefined,
        })),
      };
    }));
    return Response.json({ reviews });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const body = (await request.json()) as { submissionId?: string; reason?: string };
    const reason = body.reason?.trim() || 'Participant requested a review.';
    if (!body.submissionId || reason.length > 2000) {
      return Response.json(
        { error: 'submissionId is required and the optional explanation must be at most 2,000 characters' },
        { status: 400 },
      );
    }
    const submission = await env.DB.prepare(
      'SELECT id FROM submission WHERE id = ? AND user_id = ?',
    )
      .bind(body.submissionId, user.id)
      .first();
    if (!submission) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }
    const existing = await env.DB.prepare(
      `SELECT id FROM review
        WHERE submission_id = ? AND status IN ('requested', 'in_review')`,
    )
      .bind(body.submissionId)
      .first();
    if (existing) {
      return Response.json({ error: 'An active review already exists' }, { status: 409 });
    }
    const reviewId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO review (id, submission_id, requested_by, reason)
         VALUES (?, ?, ?, ?)`,
      ).bind(reviewId, body.submissionId, user.id, reason),
      env.DB.prepare("UPDATE submission SET status = 'flagged' WHERE id = ?").bind(
        body.submissionId,
      ),
      env.DB.prepare(
        `INSERT INTO audit_event (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'review.requested', 'review', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        user.id,
        reviewId,
        JSON.stringify({ submissionId: body.submissionId, reason }),
      ),
    ]);
    return Response.json({ reviewId, status: 'requested' }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
