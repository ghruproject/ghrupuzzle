'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { usePathname, useRouter } from 'next/navigation';
import { NavBar } from '@genomicx/ui';
import { authClient } from '@/lib/auth-client';
import { ChallengeBanner } from './challenge-banner';

// Bridges react-router-dom navigation (used by @genomicx/ui NavBar) to Next.js router.
function RouterSyncer() {
  const location = useLocation();
  const pathname = usePathname();
  const router = useRouter();
  const previousMemoryPath = useRef(location.pathname);

  useEffect(() => {
    if (
      location.pathname !== previousMemoryPath.current &&
      location.pathname !== pathname
    ) {
      previousMemoryPath.current = location.pathname;
      router.push(location.pathname);
    }
  }, [location.pathname, pathname, router]);

  return null;
}

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
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <>
      <Link href="/#practice" className={className}>
        Practice
      </Link>
      <Link href="/challenge" className={className}>
        Challenge
      </Link>
      <Link href="/guides" className={className}>
        Guides
      </Link>
      {!isPending && session ? (
        <>
          <Link href="/dashboard" className={className}>
            Dashboard
          </Link>
          <button type="button" className={className} onClick={signOut}>
            Sign out
          </button>
        </>
      ) : !isPending ? (
        <Link href="/sign-in" className={className}>
          Sign in
        </Link>
      ) : null}
    </>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

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
    <MemoryRouter key={pathname} initialEntries={[pathname]}>
      <RouterSyncer />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gx-bg)' }}>
        <NavBar
          appName="GHRUPUZZLES"
          appSubtitle="Microbial genome benchmarking exercises"
          version="0.2.0"
          icon={<PuzzleIcon />}
          actions={<ExerciseLinks />}
          mobileActions={<ExerciseLinks mobile />}
        />
        <ChallengeBanner />
        <main style={{ flex: 1 }}>{children}</main>
        <footer className="gx-footer">
          <div className="gx-footer-inner">
            <div className="gx-footer-content">
              <div className="gx-footer-text">
                <p className="gx-footer-text-title">GHRUPUZZLES</p>
                <p className="gx-footer-text-sub">
                  Funded by the National Institute for Health Research (NIHR) under grant NIHR133307.
                </p>
              </div>
              <div className="gx-footer-links" />
            </div>
          </div>
        </footer>
      </div>
    </MemoryRouter>
  );
}
