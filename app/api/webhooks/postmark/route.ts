import { getEnv } from '@/lib/cloudflare';

export async function POST(request: Request): Promise<Response> {
  const env = await getEnv();
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!(await sameSecret(supplied, env.POSTMARK_WEBHOOK_SECRET))) {
    return new Response('Unauthorized', { status: 401 });
  }
  const payload = (await request.json()) as Record<string, unknown>;
  const eventType = String(payload.RecordType ?? 'Unknown');
  if (!['Delivery', 'Bounce', 'SpamComplaint', 'SubscriptionChange'].includes(eventType)) {
    return new Response(null, { status: 204 });
  }
  await env.DB.prepare(
    `INSERT INTO email_event
       (id, message_id, event_type, recipient, details_json)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      payload.MessageID ? String(payload.MessageID) : null,
      eventType,
      payload.Recipient ? String(payload.Recipient).toLowerCase() : null,
      JSON.stringify(payload),
    )
    .run();
  return new Response(null, { status: 204 });
}

async function sameSecret(left: string, right: string): Promise<boolean> {
  if (!left || !right) return false;
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}
