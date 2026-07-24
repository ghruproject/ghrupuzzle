import { getEnv } from '@/lib/cloudflare';
import {
  hasAdministratorAccess,
  jsonError,
  requireUser,
} from '@/lib/assessment';

export async function GET(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const [result, administrator] = await Promise.all([
      env.DB.prepare(
        "SELECT role FROM user_role WHERE user_id = ? AND role != 'administrator' ORDER BY role",
      )
      .bind(user.id)
      .all<{ role: string }>(),
      hasAdministratorAccess(env.DB, user.email),
    ]);
    const roles = result.results.map((row) => row.role);
    if (administrator) roles.push('administrator');
    return Response.json({ roles });
  } catch (error) {
    return jsonError(error);
  }
}
