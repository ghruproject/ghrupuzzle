'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppShell } from './genomicx-ui/AppShell';
import { DEMO_MODE } from '@/lib/demo';

function ExerciseLinks({ mobile = false }: { mobile?: boolean }) {
  const className = mobile ? 'gx-nav-dropdown-link' : 'gx-nav-link';

  return (
    <>
      <Link href="/assembly" className={className}>
        Assembly
      </Link>
      <Link href="/hybrid-assembly" className={className}>
        Hybrid
      </Link>
      <Link href="/typing" className={className}>
        Typing
      </Link>
      <Link href="/outbreak" className={className}>
        Outbreak
      </Link>
      <Link href="/dashboard" className={className}>
        Dashboard
      </Link>
      <Link href="/sign-in" className={className}>
        Sign in
      </Link>
    </>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <AppShell
      appName="GHRUPUZZLES"
      appSubtitle="Microbial genome benchmarking exercises"
      version="0.2.0"
      actions={<ExerciseLinks />}
      mobileActions={<ExerciseLinks mobile />}
    >
      {DEMO_MODE ? (
        <div className="gx-demo-banner">
          Vercel UX preview — sample actions are simulated and no assessment records are saved.
        </div>
      ) : null}
      {children}
    </AppShell>
  );
}
