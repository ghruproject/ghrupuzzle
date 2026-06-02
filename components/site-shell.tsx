'use client';

import Link from 'next/link';
import { useState, useEffect, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '@genomicx/ui';

function PuzzleIcon() {
  return (
    <svg className="gx-nav-logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="var(--gx-accent)"
        d="M3 3 L9 3 Q9 1 11 1 Q13 1 13 3 L21 3 L21 9 Q23 9 23 11 Q23 13 21 13 L21 21 L15 21 Q15 23 13 23 Q11 23 11 21 L3 21 L3 15 Q1 15 1 13 Q1 11 3 11 Z"
      />
    </svg>
  );
}

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a minimal shell during SSR/hydration to avoid document access errors
    // from @genomicx/ui's ThemeToggle, which reads document in its useState initialiser.
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gx-bg)' }}>
        <nav className="gx-nav" style={{ minHeight: '72px' }} />
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    );
  }

  return (
    <MemoryRouter>
      <AppShell
        appName="GHRUPUZZLES"
        appSubtitle="Microbial genome benchmarking exercises"
        version="0.2.0"
        icon={<PuzzleIcon />}
        actions={<ExerciseLinks />}
        mobileActions={<ExerciseLinks mobile />}
      >
        {children}
      </AppShell>
    </MemoryRouter>
  );
}
