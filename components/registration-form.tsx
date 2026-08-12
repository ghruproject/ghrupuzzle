'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function RegistrationForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [returnTo, setReturnTo] = useState('/dashboard');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get('returnTo');
    if (candidate?.startsWith('/') && !candidate.startsWith('//')) setReturnTo(candidate);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const normalisedName = name.trim().replace(/\s+/g, ' ');
    if (normalisedName.length < 2 || normalisedName.length > 120) {
      setMessage('Enter your name using 2–120 characters.');
      return;
    }
    if (password !== confirmation) {
      setMessage('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.signUp.email({
        name: normalisedName,
        email,
        password,
        callbackURL: returnTo,
      });
      if (result.error) {
        setMessage(
          'That account could not be created. If this address has been used or invited before, sign in or ask an administrator for a setup code.',
        );
        return;
      }
      window.location.assign(returnTo);
    } catch {
      setMessage('The account could not be created. Please try again.');
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
          Create your account
        </h1>
        <p className="text-[var(--gx-text-muted)]">
          Register directly with your name, email address and a password. No confirmation email
          or administrator code is required for a new public account.
        </p>
        <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
          <label className="label" htmlFor="registration-name">Your name</label>
          <input
            id="registration-name"
            className="gx-input w-full"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <label className="label" htmlFor="registration-email">Email address</label>
          <input
            id="registration-email"
            className="gx-input w-full"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label className="label" htmlFor="registration-password">Password</label>
          <input
            id="registration-password"
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
          <label className="label" htmlFor="registration-confirmation">Confirm password</label>
          <input
            id="registration-confirmation"
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
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        {message ? <p className="text-sm text-red-700 dark:text-red-300" role="alert">{message}</p> : null}
        <p className="mb-0 mt-5 text-sm text-[var(--gx-text-muted)]">
          Already have an account? <Link href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>Sign in</Link>.
        </p>
        <p className="mb-0 mt-2 text-xs text-[var(--gx-text-muted)]">
          If an administrator imported your address for an invite-only cohort, use the setup code
          they provide instead of registering again.
        </p>
      </section>
    </div>
  );
}
