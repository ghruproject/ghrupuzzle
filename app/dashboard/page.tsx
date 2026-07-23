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
      <div className="gx-page">
        <section className="gx-hero">
          <div className="gx-kicker">Participant dashboard · preview</div>
          <h1>Welcome, Demo Participant</h1>
          <p className="gx-hero-copy">
            Explore practice and challenge enrolment, upload a sample CSV, request a review, and
            inspect a demonstration certificate.
          </p>
          <div className="gx-button-row">
            <Link href="/assembly/practice" className="gx-button">Open practice exercises</Link>
            <Link href="/typing" className="gx-button gx-button-secondary">Open demo challenge</Link>
          </div>
        </section>
        <div className="gx-grid">
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
    <div className="gx-page">
      <section className="gx-hero">
        <div className="gx-kicker">Participant dashboard</div>
        <h1>Welcome, {session.user.name}</h1>
        <p className="gx-hero-copy">
          Practice datasets remain available at any time. Challenge availability and deadlines are
          checked by the server for your enrolments.
        </p>
        <div className="gx-button-row">
          <Link href="/assembly/practice" className="gx-button">Open practice exercises</Link>
        </div>
      </section>
      <div className="gx-grid">
        <RoundList />
        <ParticipantRecord />
      </div>
    </div>
  );
}
