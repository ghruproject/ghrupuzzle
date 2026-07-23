'use client';

import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function emailSignIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: '/dashboard',
      errorCallbackURL: '/sign-in',
    });
    setBusy(false);
    setMessage(
      result.error
        ? 'The link could not be sent. Please check the address and try again.'
        : 'If that address can receive email, a sign-in link is on its way.',
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="card max-w-xl mx-auto">
        <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">Participant account</div>
        <h1 className="text-3xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">Sign in to GHRU Puzzles</h1>
        <p className="text-[var(--gx-text-muted)]">
          Enter your email address and we will send you a secure, single-use sign-in link.
        </p>
        <div className="flex flex-col gap-4">
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
        </div>
      </section>
    </div>
  );
}
