import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireUser } from '@/lib/assessment';

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const result = await env.DB.prepare(
      'SELECT role FROM user_role WHERE user_id = ? ORDER BY role',
    )
      .bind(user.id)
      .all<{ role: string }>();
    return Response.json({ roles: result.results.map((row) => row.role) });
  } catch (error) {
    return jsonError(error);
  }
}
