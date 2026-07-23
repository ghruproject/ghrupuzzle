import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAuth } from '@/lib/auth';
import { getEnv } from '@/lib/cloudflare';
import { ReviewQueue } from '@/components/review-queue';
import { DEMO_MODE } from '@/lib/demo';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  if (DEMO_MODE) {
    return (
      <div className="gx-page">
        <section className="gx-hero">
          <div className="gx-kicker">Review workspace · preview</div>
          <h1>Manual review queue</h1>
          <p className="gx-hero-copy">Try recording a simulated reviewer decision.</p>
        </section>
        <ReviewQueue />
      </div>
    );
  }
  const session = await (await createAuth()).api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in');
  const env = await getEnv();
  const role = await env.DB.prepare(
    "SELECT role FROM user_role WHERE user_id = ? AND role IN ('reviewer', 'administrator')",
  )
    .bind(session.user.id)
    .first();
  if (!role) redirect('/dashboard');
  return (
    <div className="gx-page">
      <section className="gx-hero">
        <div className="gx-kicker">Review workspace</div>
        <h1>Manual review queue</h1>
        <p className="gx-hero-copy">Confirm or overrule provisional results with an audited reason.</p>
      </section>
      <ReviewQueue />
    </div>
  );
}
