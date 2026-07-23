import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAuth } from '@/lib/auth';
import { RoundList } from '@/components/round-list';
import { ParticipantRecord } from '@/components/participant-record';
import { DEMO_MODE } from '@/lib/demo';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  if (DEMO_MODE) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
          <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">Participant dashboard · preview</div>
          <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">Welcome, Demo Participant</h1>
          <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-5">
            Explore practice and challenge enrolment, upload a sample CSV, request a review, and
            inspect a demonstration certificate.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/assembly/practice" className="gx-btn gx-btn-primary">Open practice exercises</Link>
            <Link href="/typing" className="gx-btn gx-btn-secondary">Open demo challenge</Link>
          </div>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RoundList />
          <ParticipantRecord />
        </div>
      </div>
    );
  }
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect('/sign-in');
  }
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] p-8 shadow-sm mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">Participant dashboard</div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">Welcome, {session.user.name}</h1>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-5">
          Practice datasets remain available at any time. Challenge availability and deadlines are
          checked by the server for your enrolments.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link href="/assembly/practice" className="gx-btn gx-btn-primary">Open practice exercises</Link>
        </div>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RoundList />
        <ParticipantRecord />
      </div>
    </div>
  );
}
