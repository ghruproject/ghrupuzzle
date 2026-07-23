'use client';

import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function ProfileCard({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (normalized.length < 2 || normalized.length > 120) {
      setMessage('Enter a name between 2 and 120 characters.');
      return;
    }
    setBusy(true);
    setMessage('');
    const result = await authClient.updateUser({ name: normalized });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message || 'Your name could not be updated.');
      return;
    }
    setName(normalized);
    setSavedName(normalized);
    setMessage('Name updated.');
  }

  return (
    <section className="card h-full">
      <h2 className="text-xl font-bold text-[var(--gx-text)] mt-0 mb-2">Your profile</h2>
      <p className="text-sm text-[var(--gx-text-muted)] mt-0 mb-5">
        This name appears in your dashboard and on future certificates.
      </p>
      <form className="flex flex-col gap-3" onSubmit={save}>
        <label className="label" htmlFor="participant-name">Name for certificates</label>
        <input
          id="participant-name"
          className="gx-input w-full"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-xs text-[var(--gx-text-muted)] m-0">{email}</p>
        <button
          className="gx-btn gx-btn-primary self-start"
          type="submit"
          disabled={busy || name.trim() === savedName}
        >
          {busy ? 'Saving…' : 'Save name'}
        </button>
        {message ? <p className="text-sm text-[var(--gx-text-muted)] m-0" role="status">{message}</p> : null}
      </form>
    </section>
  );
}
