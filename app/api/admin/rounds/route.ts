import { getEnv } from '@/lib/cloudflare';
import { jsonError, requireRole, requireUser } from '@/lib/assessment';

export async function POST(request: Request): Promise<Response> {
  try {
    const env = await getEnv();
    const actor = await requireUser(request);
    await requireRole(env.DB, actor.id, ['administrator']);
    const body = (await request.json()) as {
      slug?: string;
      title?: string;
      registrationMode?: 'open' | 'invite';
      registrationOpensAt?: string;
      opensAt?: string;
      closesAt?: string;
      answersReleaseAt?: string;
      graceSeconds?: number;
    };
    if (
      !body.slug?.match(/^[a-z0-9][a-z0-9-]*$/) ||
      !body.title?.trim() ||
      !['open', 'invite'].includes(body.registrationMode ?? '') ||
      !validDate(body.opensAt) ||
      !validDate(body.closesAt) ||
      new Date(body.opensAt as string) >= new Date(body.closesAt as string)
    ) {
      return Response.json({ error: 'Round fields or timestamps are invalid' }, { status: 400 });
    }
    const roundId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO assessment_round
           (id, slug, title, registration_mode, registration_opens_at, opens_at,
            closes_at, answers_release_at, grace_seconds, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      ).bind(
        roundId,
        body.slug,
        body.title.trim(),
        body.registrationMode,
        body.registrationOpensAt ?? null,
        body.opensAt,
        body.closesAt,
        body.answersReleaseAt ?? null,
        Math.max(0, Math.floor(body.graceSeconds ?? 0)),
      ),
      env.DB.prepare(
        `INSERT INTO audit_event
           (id, actor_user_id, action, target_type, target_id, after_json)
         VALUES (?, ?, 'round.created', 'assessment_round', ?, ?)`,
      ).bind(crypto.randomUUID(), actor.id, roundId, JSON.stringify(body)),
    ]);
    return Response.json({ roundId }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

function validDate(value: string | undefined): boolean {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}
