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
      <div className="max-w-5xl mx-auto px-4 py-10">
        <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
          <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">Review workspace · preview</div>
          <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">Manual review queue</h1>
          <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-5">Try recording a simulated reviewer decision.</p>
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
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">Review workspace</div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">Manual review queue</h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-5">Confirm or overrule provisional results with an audited reason.</p>
      </section>
      <ReviewQueue />
    </div>
  );
}
