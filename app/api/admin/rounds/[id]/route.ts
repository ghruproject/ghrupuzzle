import { getEnv } from '@/lib/cloudflare';
import { getAdminRoundCompletion } from '@/lib/admin-round-completion';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const { id } = await context.params;
    const completion = await getAdminRoundCompletion(env.DB, id);
    if (!completion) {
      return Response.json({ error: 'Challenge round not found' }, { status: 404 });
    }
    return Response.json(completion);
  } catch (error) {
    return jsonError(error);
  }
}
