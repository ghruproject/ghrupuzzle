import { getEnv } from '@/lib/cloudflare';
import {
  hasAdministratorAccess,
  jsonError,
  requireUser,
} from '@/lib/assessment';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = await getEnv();
    const user = await requireUser(request);
    const { id } = await context.params;
    const administrator = await hasAdministratorAccess(env.DB, user.email);
    const certificate = await env.DB.prepare(
      `SELECT c.pdf_object_key
         FROM certificate c
        WHERE c.id = ? AND c.revoked_at IS NULL
          AND (c.user_id = ? OR ? = 1)`,
    )
      .bind(id, user.id, administrator ? 1 : 0)
      .first<{ pdf_object_key: string }>();
    if (!certificate) {
      return new Response('Certificate not found', { status: 404 });
    }
    const object = await env.PRIVATE_ASSETS.get(certificate.pdf_object_key);
    if (!object) {
      return new Response('Certificate PDF unavailable', { status: 503 });
    }
    return new Response(object.body, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="ghru-puzzles-${id}.pdf"`,
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
