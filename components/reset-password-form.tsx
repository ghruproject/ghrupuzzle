'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

export function ResetPasswordForm() {
  const [token, setToken] = useState('');
  const [invalidToken, setInvalidToken] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setToken(search.get('token') || '');
    setInvalidToken(search.get('error') === 'INVALID_TOKEN' || !search.get('token'));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password !== confirmation) {
      setMessage('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPassword: password, token }),
      });
      if (!response.ok) {
        setInvalidToken(true);
        return;
      }
      setPassword('');
      setConfirmation('');
      setComplete(true);
    } catch {
      setMessage('Your password could not be reset. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="card mx-auto max-w-xl">
        <div className="mb-3 inline-flex text-xs font-extrabold uppercase tracking-widest text-[var(--gx-accent)]">
          Participant account
        </div>
        <h1 className="mb-4 mt-0 text-3xl font-bold leading-tight text-[var(--gx-text)]">
          Choose a new password
        </h1>
        {complete ? (
          <div role="status">
            <p className="text-[var(--gx-text-muted)]">
              Your password has been changed. For your security, any existing sessions have been signed out.
            </p>
            <Link className="gx-btn gx-btn-primary mt-2" href="/sign-in">Continue to sign in</Link>
          </div>
        ) : invalidToken ? (
          <div role="alert">
            <p className="text-[var(--gx-text-muted)]">
              This password-reset link is invalid, expired or has already been used.
            </p>
            <Link className="gx-btn gx-btn-primary mt-2" href="/forgot-password">Request a new link</Link>
          </div>
        ) : (
          <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
            <label className="label" htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
              className="gx-input w-full"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="-mt-2 mb-0 text-xs text-[var(--gx-text-muted)]">
              Use at least 12 characters. A long, unique passphrase is recommended.
            </p>
            <label className="label" htmlFor="reset-password-confirmation">Confirm new password</label>
            <input
              id="reset-password-confirmation"
              className="gx-input w-full"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <button className="gx-btn gx-btn-primary w-full" disabled={busy} type="submit">
              {busy ? 'Resetting password…' : 'Reset password'}
            </button>
            {message ? <p className="text-sm text-red-700 dark:text-red-300" role="alert">{message}</p> : null}
          </form>
        )}
      </section>
    </div>
  );
}
