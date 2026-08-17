import Link from 'next/link';
import { headers } from 'next/headers';
import { createAuth } from '@/lib/auth';
import { getEnv } from '@/lib/cloudflare';
import { loadPublicChallengeSchedule } from '@/lib/challenge-data';
import { phaseLabel, type PublicChallengeRound } from '@/lib/challenge';
import { PRACTICE_EXERCISES } from '@/lib/practice-exercises';
import { publicPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = publicPageMetadata({
  title: 'Challenge',
  description:
    'View upcoming microbial genomics challenge dates, sign up to participate and receive an opening-day reminder.',
  path: '/challenge',
  keywords: ['microbial genomics challenge', 'bioinformatics proficiency assessment'],
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

function ChallengeAction({
  challenge,
  signedIn,
  enrolled,
}: {
  challenge: PublicChallengeRound;
  signedIn: boolean;
  enrolled: boolean;
}) {
  if (challenge.phase === 'open') {
    if (enrolled) {
      return (
        <p className="m-0 text-sm font-bold text-[var(--gx-text-bright)]">
          Choose a challenge exercise below <span aria-hidden="true">↓</span>
        </p>
      );
    }
    if (signedIn) {
      return (
        <Link className="gx-btn gx-btn-primary" href="/dashboard#challenge-status">
          Sign up for the challenge
        </Link>
      );
    }
    return (
      <Link
        className="gx-btn gx-btn-primary"
        href="/sign-in?returnTo=%2Fdashboard%23challenge-status"
      >
        Sign in to start the challenge
      </Link>
    );
  }
  const registrationIsOpen =
    challenge.registrationMode === 'open' &&
    (!challenge.registrationOpensAt ||
      new Date(challenge.registrationOpensAt).getTime() <= Date.now());
  if (registrationIsOpen) {
    if (signedIn) {
      return (
        <Link className="gx-btn gx-btn-primary" href="/dashboard#challenge-status">
          {enrolled ? 'View your challenge signup' : 'Sign up for the challenge'}
        </Link>
      );
    }
    return (
      <Link
        className="gx-btn gx-btn-primary"
        href="/sign-in?returnTo=%2Fdashboard%23challenge-status"
      >
        Sign up for the challenge
      </Link>
    );
  }
  return (
    <Link
      className="gx-btn gx-btn-primary"
      href={
        signedIn
          ? '/dashboard#challenge-status'
          : '/sign-in?returnTo=%2Fdashboard%23challenge-status'
      }
    >
      View challenge signup
    </Link>
  );
}

export default async function ChallengePage() {
  const env = await getEnv();
  const [schedule, auth, requestHeaders] = await Promise.all([
    loadPublicChallengeSchedule(env.DB),
    createAuth(),
    headers(),
  ]);
  const session = await auth.api.getSession({ headers: requestHeaders });
  const featured = schedule.featured;
  const enrolment =
    featured && session
      ? await env.DB.prepare(
          `SELECT status
           FROM enrolment
          WHERE round_id = ? AND user_id = ?
          LIMIT 1`,
        )
          .bind(featured.id, session.user.id)
          .first<{ status: string }>()
      : null;
  const enrolled = enrolment?.status === 'active';

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
            <p className="text-sm text-[var(--gx-text-muted)] mt-0 mb-5">
              {dateTimeFormatter.format(new Date(featured.opensAt))} –{' '}
              {dateTimeFormatter.format(new Date(featured.closesAt))}
            </p>
            <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-6">
              Work through a new time-limited dataset covering the four exercise areas. Your
              submissions are assessed and recorded in your participant dashboard.
            </p>
            <ChallengeAction
              challenge={featured}
              signedIn={Boolean(session)}
              enrolled={enrolled}
            />
            {featured.phase === 'upcoming' ? (
              <p className="text-sm text-[var(--gx-text-muted)] mt-4 mb-0">
                Sign up once and we will email you when the challenge opens.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-lg text-[var(--gx-text-muted)] max-w-3xl mb-0">
            No challenge is currently scheduled. The public practice exercises remain available at
            any time.
          </p>
        )}
      </section>

      <section
        id={featured?.phase === 'open' && enrolled ? 'challenge-exercises' : undefined}
        className="card scroll-mt-24"
      >
        <h2 className="text-2xl font-bold text-[var(--gx-text)] mt-0 mb-3">
          {featured?.phase === 'open' && enrolled
            ? 'Choose a challenge exercise'
            : 'What the challenge covers'}
        </h2>
        <div className="divide-y divide-[var(--gx-border)]">
          {PRACTICE_EXERCISES.map((exercise) => (
            <article key={exercise.practiceHref} className="py-4 first:pt-1 last:pb-1">
              <h3 className="text-lg font-bold text-[var(--gx-text)] mt-0 mb-1">{exercise.title}</h3>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--gx-text-muted)] m-0">{exercise.copy}</p>
                {featured?.phase === 'open' && enrolled ? (
                  <Link
                    className="gx-btn gx-btn-primary shrink-0"
                    href={exercise.challengeHref}
                  >
                    Open exercise
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        {featured?.phase === 'open' && enrolled ? (
          <Link className="inline-flex mt-5 font-semibold" href="/dashboard">
            Return to participant dashboard →
          </Link>
        ) : (
          <Link className="inline-flex mt-5 font-semibold" href="/#practice">
            Prepare with the practice exercises →
          </Link>
        )}
      </section>
    </div>
  );
}
