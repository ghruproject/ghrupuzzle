'use client';

import { useEffect, useState } from 'react';

type ThemeName = 'light' | 'dark';

function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const savedTheme = window.localStorage.getItem('gx-theme');
  return savedTheme === 'light' ? 'light' : 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>('dark');

  useEffect(() => {
    const savedTheme = getStoredTheme();
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  function updateTheme(nextTheme: ThemeName) {
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    window.localStorage.setItem('gx-theme', nextTheme);
  }

  return (
    <div className="gx-theme-toggle" aria-label="Theme toggle">
      <button
        type="button"
        className={`gx-theme-btn ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => updateTheme('dark')}
        aria-pressed={theme === 'dark'}
      >
        Dark
      </button>
      <button
        type="button"
        className={`gx-theme-btn ${theme === 'light' ? 'active' : ''}`}
        onClick={() => updateTheme('light')}
        aria-pressed={theme === 'light'}
      >
        Light
      </button>
    </div>
  );
}
