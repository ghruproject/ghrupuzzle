import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAuth } from '@/lib/auth';
import { getEnv } from '@/lib/cloudflare';
import { ReviewQueue } from '@/components/review-queue';
import { privatePageMetadata } from '@/lib/seo';
import { requireRole } from '@/lib/assessment';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata('Review workspace');

export default async function ReviewPage() {
  const session = await (await createAuth()).api.getSession({ headers: await headers() });
  if (!session) redirect('/sign-in');
  const env = await getEnv();
  try {
    await requireRole(env.DB, session.user, ['reviewer', 'administrator']);
  } catch {
    redirect('/dashboard');
  }
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
