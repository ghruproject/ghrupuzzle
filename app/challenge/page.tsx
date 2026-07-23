import Link from 'next/link';
import { ChallengeNotificationForm } from '@/components/challenge-notification-form';
import { getEnv } from '@/lib/cloudflare';
import { loadPublicChallengeSchedule } from '@/lib/challenge-data';
import { phaseLabel, type PublicChallengeRound } from '@/lib/challenge';
import { PRACTICE_EXERCISES } from '@/lib/practice-exercises';

export const dynamic = 'force-dynamic';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

function ChallengeAction({ challenge }: { challenge: PublicChallengeRound }) {
  if (challenge.phase === 'open') {
    return (
      <Link className="gx-btn gx-btn-primary" href="/sign-in?returnTo=%2Fdashboard">
        Sign in to start the challenge
      </Link>
    );
  }
  const registrationIsOpen =
    challenge.registrationMode === 'open' &&
    (!challenge.registrationOpensAt ||
      new Date(challenge.registrationOpensAt).getTime() <= Date.now());
  if (registrationIsOpen) {
    return (
      <Link className="gx-btn gx-btn-primary" href="/sign-in?returnTo=%2Fdashboard">
        Sign up for the challenge
      </Link>
    );
  }
  return (
    <a className="gx-btn gx-btn-primary" href="#reminder">
      Register for a reminder
    </a>
  );
}

export default async function ChallengePage() {
  const env = await getEnv();
  const schedule = await loadPublicChallengeSchedule(env.DB);
  const featured = schedule.featured;
  const upcoming = schedule.rounds.filter((round) => round.phase !== 'closed');

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="card mb-8">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          Timed assessment
        </div>
        <h1 className="text-4xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          {featured?.title ?? 'Challenge'}
        </h1>
        {featured ? (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <p className="text-xl font-semibold text-[var(--gx-text)] m-0">{featured.dateLabel}</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
                {phaseLabel(featured.phase)}
              </span>
            </div>
            <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-6">
              Work through a new time-limited dataset covering the four exercise areas. Your
              submissions are assessed and recorded in your participant dashboard.
            </p>
            <ChallengeAction challenge={featured} />
          </>
        ) : (
          <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-0">
            No challenge is currently scheduled. The public practice exercises remain available at
            any time.
          </p>
        )}
      </section>

      {featured?.phase === 'upcoming' ? (
        <section id="reminder" className="card mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-3">
            Get an opening-day reminder
          </h2>
          <p className="text-[var(--gx-text-muted)] mb-5">
            Register an email address and we will send one message when {featured.title} opens.
          </p>
          <ChallengeNotificationForm challenge={featured} />
        </section>
      ) : null}

      <section className="card mb-8">
        <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-3">
          Challenge calendar
        </h2>
        {upcoming.length ? (
          <div className="divide-y divide-[var(--gx-border)]">
            {upcoming.map((round) => (
              <article
                key={round.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--gx-text)] m-0">{round.title}</h3>
                  <p className="text-sm text-[var(--gx-text-muted)] mt-1 mb-0">
                    {dateTimeFormatter.format(new Date(round.opensAt))} –{' '}
                    {dateTimeFormatter.format(new Date(round.closesAt))}
                  </p>
                </div>
                <span className="inline-flex self-start items-center px-3 py-1 rounded-full border border-[var(--gx-border)] bg-[var(--gx-accent-dim)] text-[var(--gx-text-bright)] text-xs font-semibold">
                  {phaseLabel(round.phase)}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-[var(--gx-text-muted)] m-0">No upcoming challenge dates are published.</p>
        )}
      </section>

      <section className="card">
        <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-3">
          What the challenge covers
        </h2>
        <div className="divide-y divide-[var(--gx-border)]">
          {PRACTICE_EXERCISES.map((exercise) => (
            <article key={exercise.practiceHref} className="py-4 first:pt-1 last:pb-1">
              <h3 className="text-lg font-bold text-[var(--gx-text)] mt-0 mb-1">{exercise.title}</h3>
              <p className="text-sm text-[var(--gx-text-muted)] m-0">{exercise.copy}</p>
            </article>
          ))}
        </div>
        <Link className="inline-flex mt-5 font-semibold" href="/practice">
          Prepare with the practice exercises →
        </Link>
      </section>
    </div>
  );
}
