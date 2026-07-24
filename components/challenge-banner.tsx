'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import type {
  PublicChallengeRound,
  PublicChallengeSchedule,
} from '@/lib/challenge';
import type { DashboardRound } from '@/lib/dashboard';

export function ChallengeBanner() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const userId = session?.user.id;
  const [challenge, setChallenge] = useState<PublicChallengeRound | null>(null);
  const [enrolmentStatus, setEnrolmentStatus] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPending) return;
    let active = true;

    const scheduleRequest = fetch('/api/challenges').then(
      (response) => response.json() as Promise<PublicChallengeSchedule>,
    );
    const roundRequest = userId
      ? fetch('/api/rounds')
          .then((response) =>
            response.ok
              ? (response.json() as Promise<{ rounds?: DashboardRound[] }>)
              : { rounds: [] },
          )
          .catch(() => ({ rounds: [] }))
      : Promise.resolve({ rounds: [] as DashboardRound[] });

    Promise.all([scheduleRequest, roundRequest])
      .then(([schedule, roundResult]) => {
        if (!active || !schedule.featured || schedule.featured.phase === 'closed') {
          return;
        }
        const dismissalKey = `challenge-banner:${schedule.featured.slug}`;
        const matchingRound = roundResult.rounds?.find(
          (round) => round.slug === schedule.featured?.slug,
        );
        setChallenge(schedule.featured);
        setEnrolmentStatus(matchingRound?.enrolment_status ?? null);
        setVisible(
          window.localStorage.getItem(dismissalKey) !== 'dismissed',
        );
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [isPending, userId]);

  if (!visible || !challenge) return null;

  function dismiss() {
    window.localStorage.setItem(
      `challenge-banner:${challenge?.slug}`,
      'dismissed',
    );
    setVisible(false);
  }

  const isOpen = challenge.phase === 'open';
  const signedUp = enrolmentStatus === 'active';
  const actionHref = signedUp && isOpen
    ? '/challenge'
    : session
      ? '/dashboard#challenge-status'
      : '/sign-in?returnTo=%2Fdashboard';
  const actionLabel = signedUp && isOpen
    ? 'Start challenge'
    : signedUp
      ? 'View dashboard'
      : 'Sign up';
  const showAction = !(
    signedUp &&
    !isOpen &&
    pathname === '/dashboard'
  );

  return (
    <aside
      aria-label="Challenge announcement"
      className="border-b border-[var(--gx-border)] bg-[var(--gx-accent-dim)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <p className="m-0 flex-1 text-sm text-[var(--gx-text)]">
          <strong>
            {signedUp
              ? isOpen
                ? `${challenge.title} is open now.`
                : `You’re signed up for ${challenge.title}.`
              : isOpen
                ? `${challenge.title} is open.`
                : `Next challenge: ${challenge.dateLabel}.`}
          </strong>{' '}
          {signedUp
            ? isOpen
              ? 'Complete your submissions before the round closes.'
              : `We will email you when it opens. Challenge dates: ${challenge.dateLabel}.`
            : isOpen
              ? 'Sign up to access the challenge datasets.'
              : 'Sign up to take part and receive an email when it opens, or practise now.'}
        </p>
        <div className="flex items-center gap-2">
          {showAction ? (
            <Link className="gx-btn gx-btn-primary" href={actionHref}>
              {actionLabel}
            </Link>
          ) : null}
          <button
            className="gx-btn gx-btn-secondary"
            type="button"
            aria-label="Dismiss challenge announcement"
            onClick={dismiss}
          >
            Close
          </button>
        </div>
      </div>
    </aside>
  );
}
