'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

const SUPPORT_EMAIL = 'nabil.alikhan@cgps.group';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: '/reset-password' }),
      });
    } catch {
      // Do not disclose whether an account exists or whether email delivery failed.
    } finally {
      // The same response protects account privacy and provides a useful fallback if delivery fails.
      setSubmitted(true);
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
          Reset your password
        </h1>
        {submitted ? (
          <div role="status">
            <p className="text-[var(--gx-text-muted)]">
              If an account matches that address, we have sent a password-reset link. Check your
              spam or junk folder as well as your inbox.
            </p>
            <p className="text-[var(--gx-text-muted)]">
              If the email does not arrive, contact{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for a one-time recovery code.
            </p>
            <button className="gx-btn gx-btn-secondary mt-2" type="button" onClick={() => setSubmitted(false)}>
              Try another email address
            </button>
          </div>
        ) : (
          <>
            <p className="text-[var(--gx-text-muted)]">
              Enter the email address used for your account and we will send you a secure link to
              choose a new password.
            </p>
            <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
              <label className="label" htmlFor="forgot-password-email">Email address</label>
              <input
                id="forgot-password-email"
                className="gx-input w-full"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button className="gx-btn gx-btn-primary w-full" disabled={busy} type="submit">
                {busy ? 'Sending reset link…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <p className="mb-0 mt-5 text-sm text-[var(--gx-text-muted)]">
          Remembered your password? <Link href="/sign-in">Return to sign in</Link>.
        </p>
      </section>
    </div>
  );
}
