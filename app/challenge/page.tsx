import Link from 'next/link';
import { ChallengeNotificationForm } from '@/components/challenge-notification-form';
import { PracticeCards } from '@/components/practice-cards';
import { NEXT_CHALLENGE } from '@/lib/challenge';

export default function ChallengePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="card mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          Timed assessment
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          {NEXT_CHALLENGE.title}
        </h1>
        <p className="text-xl font-semibold text-[var(--gx-text)] mb-3">
          {NEXT_CHALLENGE.dateLabel}
        </p>
        <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-6">
          The challenge is the time-limited assessed event. Create an account before it opens,
          practise with the public datasets, and return here when the challenge begins.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="gx-btn gx-btn-primary" href="/sign-in?returnTo=%2Fdashboard">
            Sign in or create an account
          </Link>
          <Link className="gx-btn gx-btn-secondary" href="/practice">
            Explore practice exercises
          </Link>
        </div>
      </section>

      <section id="reminder" className="card mb-8 scroll-mt-24">
        <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-3">
          Get an opening-day reminder
        </h2>
        <p className="text-[var(--gx-text-muted)] mb-5">
          Register an email address and we will notify you automatically when the challenge opens.
        </p>
        <ChallengeNotificationForm />
      </section>

      <section>
        <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-4">Prepare with practice</h2>
        <PracticeCards />
      </section>
    </div>
  );
}
