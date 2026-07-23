'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicChallengeRound, PublicChallengeSchedule } from '@/lib/challenge';

export function ChallengeBanner() {
  const [challenge, setChallenge] = useState<PublicChallengeRound | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/challenges')
      .then((response) => response.json() as Promise<PublicChallengeSchedule>)
      .then((schedule) => {
        if (!active || !schedule.featured) return;
        const dismissalKey = `challenge-banner:${schedule.featured.slug}`;
        setChallenge(schedule.featured);
        setVisible(window.localStorage.getItem(dismissalKey) !== 'dismissed');
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!visible || !challenge) return null;

  function dismiss() {
    window.localStorage.setItem(`challenge-banner:${challenge?.slug}`, 'dismissed');
    setVisible(false);
  }

  const isOpen = challenge.phase === 'open';

  return (
    <aside
      aria-label="Challenge announcement"
      className="border-b border-[var(--gx-border)] bg-[var(--gx-accent-dim)]"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-[var(--gx-text)] m-0 flex-1">
          <strong>
            {isOpen ? `${challenge.title} is open.` : `Next challenge: ${challenge.dateLabel}.`}
          </strong>{' '}
          {isOpen
            ? 'Sign in to start or continue your submissions.'
            : 'Sign up to take part, register for a reminder, or practise now.'}
        </p>
        <div className="flex items-center gap-2">
          <Link
            className="gx-btn gx-btn-primary"
            href={isOpen ? '/sign-in?returnTo=%2Fdashboard' : '/challenge#reminder'}
          >
            {isOpen ? 'Start challenge' : 'Register for reminder'}
          </Link>
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
