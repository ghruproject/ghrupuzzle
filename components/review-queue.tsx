'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DEMO_MODE } from '@/lib/demo';

interface Review {
  id: string;
  submission_id: string;
  reason: string;
  participant_name: string;
  participant_email: string;
  exercise: string;
  release_id: string;
  earned: number;
  possible: number;
  passed: number;
}

export function ReviewQueue() {
  const [reviews, setReviews] = useState<Review[]>(
    DEMO_MODE
      ? [{
          id: 'demo-review',
          submission_id: 'demo-submission',
          reason: 'The participant believes an accepted carbapenemase alias was scored incorrectly.',
          participant_name: 'Demo Participant',
          participant_email: 'demo@example.org',
          exercise: 'typing',
          release_id: 'typing-preview',
          earned: 34,
          possible: 36,
          passed: 1,
        }]
      : [],
  );
  const [message, setMessage] = useState('');

  function load() {
    if (DEMO_MODE) return;
    fetch('/api/reviews')
      .then((response) => response.json() as Promise<{ reviews?: Review[]; error?: string }>)
      .then((result) => {
        if (result.error) throw new Error(result.error);
        setReviews(result.reviews ?? []);
      })
      .catch((error: Error) => setMessage(error.message));
  }

  useEffect(load, []);

  async function decide(event: FormEvent<HTMLFormElement>, review: Review) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const status = String(data.get('status'));
    if (DEMO_MODE) {
      setReviews((current) => current.filter((item) => item.id !== review.id));
      setMessage(`Preview decision recorded: ${status}.`);
      return;
    }
    const response = await fetch(`/api/reviews/${review.id}/decision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status,
        resolution: data.get('resolution'),
        earned: Number(data.get('earned')),
        possible: Number(data.get('possible')),
        passed: data.get('passed') === 'on',
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? 'Review decision failed.');
      return;
    }
    setMessage('Review decision recorded.');
    load();
  }

  if (!reviews.length) {
    return <p className="gx-muted">{message || 'There are no open reviews.'}</p>;
  }
  return (
    <div className="gx-stack-sm">
      {reviews.map((review) => (
        <article className="card gx-panel" key={review.id}>
          <h2>{review.exercise}: {review.participant_name}</h2>
          <p className="gx-muted">{review.participant_email} · {review.release_id}</p>
          <p><strong>Request:</strong> {review.reason}</p>
          <p>Automatic score: {review.earned}/{review.possible} ({review.passed ? 'pass' : 'fail'})</p>
          <form className="gx-auth-stack" onSubmit={(event) => decide(event, review)}>
            <label>Decision
              <select className="gx-input" name="status" defaultValue="upheld">
                <option value="upheld">Uphold automatic result</option>
                <option value="overruled">Override result</option>
              </select>
            </label>
            <label>Earned points
              <input className="gx-input" name="earned" type="number" min="0" defaultValue={review.earned} />
            </label>
            <label>Possible points
              <input className="gx-input" name="possible" type="number" min="1" defaultValue={review.possible} />
            </label>
            <label><input name="passed" type="checkbox" defaultChecked={Boolean(review.passed)} /> Passing result</label>
            <label>Required reason
              <textarea className="gx-input" name="resolution" required maxLength={2000} />
            </label>
            <button className="gx-button" type="submit">Record decision</button>
          </form>
        </article>
      ))}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
