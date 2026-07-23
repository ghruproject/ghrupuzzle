import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireUser } from '@/lib/assessment';

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const rows = await env.DB.prepare(
      `SELECT c.id, c.public_code, c.issued_at, c.revoked_at, r.title AS round_title
         FROM certificate c
         JOIN assessment_round r ON r.id = c.round_id
        WHERE c.user_id = ?
        ORDER BY c.issued_at DESC`,
    )
      .bind(user.id)
      .all();
    return Response.json({ certificates: rows.results });
  } catch (error) {
    return jsonError(error);
  }
}
