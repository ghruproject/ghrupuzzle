import type { ReactNode } from 'react';
import { AppFooter } from './AppFooter';
import { NavBar, type NavBarProps } from './NavBar';

interface AppShellProps extends NavBarProps {
  children: ReactNode;
}

export function AppShell({ children, ...navProps }: AppShellProps) {
  return (
    <div className="gx-app-shell">
      <NavBar {...navProps} />
      <main className="gx-app-main">{children}</main>
      <AppFooter appName={navProps.appName} />
    </div>
  );
}
