'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

export function DashboardHeader({
  displayName,
  email,
  onNameChange,
}: {
  displayName: string;
  email: string;
  onNameChange: (name: string) => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  useEffect(() => {
    if (!profileOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) setProfileOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [busy, profileOpen]);

  function openProfile() {
    setName(displayName);
    setMessage('');
    setProfileOpen(true);
  }

  function closeProfile() {
    if (!busy) setProfileOpen(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalised = name.trim().replace(/\s+/g, ' ');
    if (normalised.length < 2 || normalised.length > 120) {
      setMessage('Enter a name between 2 and 120 characters.');
      return;
    }

    setBusy(true);
    setMessage('');
    const result = await authClient.updateUser({ name: normalised });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message || 'Your name could not be updated.');
      return;
    }

    onNameChange(normalised);
    setProfileOpen(false);
  }

  return (
    <>
      <section className="mb-8 rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] px-6 py-7 shadow-sm sm:px-8">
        <div className="mb-2 inline-flex text-xs font-extrabold uppercase tracking-widest text-[var(--gx-accent)]">
          Participant dashboard
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="m-0 text-3xl font-bold leading-tight text-[var(--gx-text)] sm:text-4xl">
              Welcome, {displayName}
            </h1>
            <p className="mb-0 mt-3 text-lg text-[var(--gx-text-muted)]">
              Track your practice results and challenge participation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:flex-nowrap">
            <Link href="/#practice" className="gx-btn gx-btn-primary">
              Open practice exercises
            </Link>
            <Link href="/challenge" className="gx-btn gx-btn-secondary">
              View challenge
            </Link>
            <button
              className="gx-btn gx-btn-secondary"
              type="button"
              onClick={openProfile}
            >
              Edit profile
            </button>
          </div>
        </div>
      </section>

      {profileOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeProfile();
          }}
        >
          <form
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--gx-border)] bg-[var(--gx-surface)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            aria-describedby="profile-dialog-description"
            onSubmit={saveProfile}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-5">
              <div>
                <p className="mb-1 mt-0 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gx-accent)]">
                  Participant profile
                </p>
                <h2
                  id="profile-dialog-title"
                  className="m-0 text-xl font-bold text-[var(--gx-text)]"
                >
                  Edit profile
                </h2>
              </div>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--gx-border)] bg-[var(--gx-surface)] text-xl leading-none text-[var(--gx-text-muted)] transition hover:border-[var(--gx-accent)] hover:text-[var(--gx-text)]"
                type="button"
                onClick={closeProfile}
                disabled={busy}
                aria-label="Close profile"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <p
                id="profile-dialog-description"
                className="m-0 text-sm leading-6 text-[var(--gx-text-muted)]"
              >
                This name appears in your dashboard and on future certificates.
              </p>
              <div>
                <label
                  className="label"
                  htmlFor="participant-name"
                >
                  Name for certificates
                </label>
                <input
                  id="participant-name"
                  className="gx-input mt-2 w-full"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={120}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={busy}
                  autoFocus
                />
              </div>
              <div>
                <span className="label">Account email</span>
                <div className="mt-2 rounded-lg border border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-3 py-2.5 text-sm text-[var(--gx-text-muted)]">
                  {email}
                </div>
              </div>
              {message ? (
                <p className="m-0 text-sm text-[var(--gx-error)]" role="alert">
                  {message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--gx-border)] bg-[var(--gx-bg-alt)] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                className="gx-btn gx-btn-secondary"
                type="button"
                onClick={closeProfile}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="gx-btn gx-btn-primary"
                type="submit"
                disabled={busy || name.trim() === displayName}
              >
                {busy ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
