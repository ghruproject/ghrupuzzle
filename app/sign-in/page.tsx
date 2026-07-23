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
      <div className="gx-page">
        <section className="card gx-auth-card">
          <div className="gx-kicker">Interactive preview</div>
          <h1>Try the participant journey</h1>
          <p className="gx-muted">
            Authentication is simulated on this Vercel preview. The Cloudflare deployment will use
            real Google, Microsoft, and Postmark sign-in.
          </p>
          <Link className="gx-button gx-auth-button" href="/dashboard">
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
    <div className="gx-page">
      <section className="card gx-auth-card">
        <div className="gx-kicker">Participant account</div>
        <h1>Sign in to GHRU Puzzles</h1>
        <p className="gx-muted">
          Use any Google or Microsoft account, or receive a single-use link at any email address.
        </p>
        <div className="gx-auth-stack">
          <button className="gx-button gx-auth-button" disabled={busy} onClick={() => social('google')}>
            Continue with Google
          </button>
          <button
            className="gx-button gx-button-secondary gx-auth-button"
            disabled={busy}
            onClick={() => social('microsoft-entra-id')}
          >
            Continue with Microsoft
          </button>
          <div className="gx-auth-divider"><span>or</span></div>
          <form onSubmit={emailSignIn} className="gx-auth-stack">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              className="gx-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="gx-button gx-auth-button" disabled={busy} type="submit">
              Email me a sign-in link
            </button>
          </form>
          {message ? <p role="status" className="gx-muted">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
