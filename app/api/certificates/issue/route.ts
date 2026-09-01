import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';
import { CertificateIssueError, issueCertificate } from '@/lib/certificate-issuance';

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor, ['administrator']);
    const body = (await request.json()) as {
      userId?: string;
      roundId?: string;
      supersedesId?: string;
    };
    if (!body.userId || !body.roundId) {
      return Response.json({ error: 'userId and roundId are required' }, { status: 400 });
    }
    const result = await issueCertificate(
      env,
      actor.id,
      body.userId,
      body.roundId,
      body.supersedesId,
    );
    return Response.json(result, { status: result.alreadyIssued ? 200 : 201 });
  } catch (error) {
    if (error instanceof CertificateIssueError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return jsonError(error);
  }
}
