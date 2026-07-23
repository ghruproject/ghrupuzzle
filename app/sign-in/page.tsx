'use client';

import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import Link from 'next/link';
import { DEMO_MODE } from '@/lib/demo';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (DEMO_MODE) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <section className="card max-w-xl mx-auto">
          <div className="inline-flex mb-3 text-xs font-extrabold tracking-widest uppercase text-[var(--gx-accent)]">Interactive preview</div>
          <h1 className="text-3xl font-bold leading-tight text-[var(--gx-text)] mt-0 mb-4">Try the participant journey</h1>
          <p className="text-[var(--gx-text-muted)]">
            Authentication is simulated on this Vercel preview. The Cloudflare deployment will use
            real Google, Microsoft, and Postmark sign-in.
          </p>
          <Link className="gx-btn gx-btn-primary w-full" href="/dashboard">
            Continue as demo participant
          </Link>
        </section>
      </div>
    );
  }

  async function social(provider: 'google' | 'microsoft-entra-id') {
    setBusy(true);
    setMessage('');
    const result =
      provider === 'google'
        ? await authClient.signIn.social({ provider, callbackURL: '/dashboard' })
        : await authClient.signIn.oauth2({ providerId: provider, callbackURL: '/dashboard' });
    if (result.error) {
      setMessage('Sign-in could not be started. Please try again.');
      setBusy(false);
    }
  }

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
          Use any Google or Microsoft account, or receive a single-use link at any email address.
        </p>
        <div className="flex flex-col gap-4">
          <button className="gx-btn gx-btn-primary w-full" disabled={busy} onClick={() => social('google')}>
            Continue with Google
          </button>
          <button
            className="gx-btn gx-btn-secondary w-full"
            disabled={busy}
            onClick={() => social('microsoft-entra-id')}
          >
            Continue with Microsoft
          </button>
          <div className="text-center text-sm text-[var(--gx-text-muted)]"><span>or</span></div>
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
              Email me a sign-in link
            </button>
          </form>
          {message ? <p role="status" className="text-[var(--gx-text-muted)]">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
