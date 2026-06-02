'use client';

import Link from 'next/link';
import { useState, useEffect, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '@genomicx/ui';

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
        actions={<ExerciseLinks />}
        mobileActions={<ExerciseLinks mobile />}
      >
        {children}
      </AppShell>
    </MemoryRouter>
  );
}
