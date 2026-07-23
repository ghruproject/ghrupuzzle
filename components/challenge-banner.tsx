'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NEXT_CHALLENGE } from '@/lib/challenge';

const DISMISSAL_KEY = `ghru-challenge-banner:${NEXT_CHALLENGE.slug}`;

export function ChallengeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(DISMISSAL_KEY) !== 'dismissed');
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISSAL_KEY, 'dismissed');
    setVisible(false);
  }

  return (
    <aside
      aria-label="Next challenge announcement"
      className="border-b border-[var(--gx-border)] bg-[var(--gx-accent-dim)]"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-[var(--gx-text)] m-0 flex-1">
          <strong>Next GHRU Challenge: {NEXT_CHALLENGE.dateLabel}.</strong>{' '}
          Register to be notified when it opens, or practise now.
        </p>
        <div className="flex items-center gap-2">
          <Link className="gx-btn gx-btn-primary" href="/challenge#reminder">
            Register for reminder
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
