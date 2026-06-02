'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppShell } from './genomicx-ui/AppShell';

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
      {children}
    </AppShell>
  );
}
