import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireUser } from '@/lib/assessment';

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const rows = await env.DB.prepare(
      `SELECT r.id, r.slug, r.title, r.registration_mode, r.registration_opens_at,
              r.opens_at, r.closes_at, r.status, e.status AS enrolment_status
         FROM assessment_round r
         LEFT JOIN enrolment e ON e.round_id = r.id AND e.user_id = ?
        WHERE r.status IN ('published', 'closed')
        ORDER BY r.opens_at DESC`,
    )
      .bind(user.id)
      .all();
    return Response.json({ rounds: rows.results });
  } catch (error) {
    return jsonError(error);
  }
}
