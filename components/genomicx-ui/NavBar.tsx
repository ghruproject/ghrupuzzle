'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export interface NavBarProps {
  appName: string;
  appSubtitle?: string;
  version?: string;
  actions?: ReactNode;
  mobileActions?: ReactNode;
}

function DefaultIcon() {
  return (
    <svg className="gx-nav-logo-icon" viewBox="0 0 24 24" fill="none" stroke="var(--gx-accent)" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function NavBar({ appName, appSubtitle, version, actions, mobileActions }: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="gx-nav">
      <div className="gx-nav-inner">
        <div className="gx-nav-row">
          <Link href="/" className="gx-nav-logo" onClick={() => setMenuOpen(false)}>
            <DefaultIcon />
            <div>
              <p className="gx-nav-logo-name">
                {appName}
                {version ? <span className="gx-nav-logo-version">v{version}</span> : null}
              </p>
              {appSubtitle ? <p className="gx-nav-logo-sub">{appSubtitle}</p> : null}
            </div>
          </Link>

          <div className="gx-nav-desktop">
            {actions}
            <Link href="/about" className="gx-nav-link">
              About
            </Link>
            <ThemeToggle />
          </div>

          <div className="gx-nav-mobile-toggle">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="gx-nav-hamburger"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg className="gx-nav-hamburger-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className="gx-nav-dropdown">
          {mobileActions}
          <Link href="/about" onClick={() => setMenuOpen(false)} className="gx-nav-dropdown-link">
            About
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
