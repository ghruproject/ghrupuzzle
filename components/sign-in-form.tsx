'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { defaultNameFromEmail } from '@/lib/profile';

export function SignInForm({
  googleEnabled,
  microsoftEnabled,
}: {
  googleEnabled: boolean;
  microsoftEnabled: boolean;
}) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [returnTo, setReturnTo] = useState('/dashboard');

  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get('returnTo');
    if (candidate?.startsWith('/') && !candidate.startsWith('//')) {
      setReturnTo(candidate);
    }
  }, []);

  async function emailSignIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const result = await authClient.signIn.magicLink({
      email,
      name: defaultNameFromEmail(email),
      callbackURL: returnTo,
      errorCallbackURL: `/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
    });
    setBusy(false);
    setMessage(
      result.error
        ? 'The link could not be sent. Please check the address and try again.'
        : 'If that address can receive email, a sign-in link is on its way.',
    );
  }

  async function socialSignIn(provider: 'google' | 'microsoft') {
    setBusy(true);
    setMessage('');
    const result = await authClient.signIn.social({
      provider,
      callbackURL: returnTo,
      errorCallbackURL: `/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
    });
    if (result?.error) {
      setBusy(false);
      setMessage(`${provider === 'google' ? 'Google' : 'Microsoft'} sign-in could not be started.`);
    }
  }

  const hasSocialSignIn = googleEnabled || microsoftEnabled;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="card max-w-xl mx-auto">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">
          Participant account
        </div>
        <h1 className="text-3xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">
          Sign in to GHRUPUZZLES
        </h1>
        <p className="text-[var(--gx-text-muted)]">
          Sign in to submit practice results, sign up for a challenge and access certificates.
          Your account is created automatically on your first successful sign-in.
        </p>

        {hasSocialSignIn ? (
          <div className="flex flex-col gap-3 mb-5">
            {googleEnabled ? (
              <button
                className="gx-btn gx-btn-secondary w-full"
                disabled={busy}
                type="button"
                onClick={() => socialSignIn('google')}
              >
                Continue with Google
              </button>
            ) : null}
            {microsoftEnabled ? (
              <button
                className="gx-btn gx-btn-secondary w-full"
                disabled={busy}
                type="button"
                onClick={() => socialSignIn('microsoft')}
              >
                Continue with Microsoft
              </button>
            ) : null}
            <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--gx-text-muted)]">
              <span className="h-px bg-[var(--gx-border)] flex-1" />
              or use email
              <span className="h-px bg-[var(--gx-border)] flex-1" />
            </div>
          </div>
        ) : null}

        <form onSubmit={emailSignIn} className="flex flex-col gap-4">
          <label className="label" htmlFor="email">Email address</label>
          <input
            id="email"
            className="gx-input w-full"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="gx-btn gx-btn-primary w-full" disabled={busy} type="submit">
            {busy ? 'Sending secure link…' : 'Email me a sign-in link'}
          </button>
        </form>
        {message ? <p role="status" className="text-[var(--gx-text-muted)]">{message}</p> : null}
        <p className="text-sm text-[var(--gx-text-muted)] mt-4 mb-0">
          You can <Link href="/#practice">preview exercises and download practice data</Link> without signing in.
        </p>
      </section>
    </div>
  );
}
