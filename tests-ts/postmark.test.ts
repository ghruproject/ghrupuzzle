import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderBrandedEmail,
  sendCertificateIssuedEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
} from '@/lib/postmark';

test('magic-link email sends a branded accessible HTML and text pair', async () => {
  const originalFetch = globalThis.fetch;
  let payload: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    assert.ok(init);
    assert.equal(typeof init.body, 'string');
    payload = JSON.parse(init.body as string) as Record<string, unknown>;
    return Response.json({
      ErrorCode: 0,
      Message: 'OK',
      MessageID: 'test-message-id',
    });
  };

  const signInUrl =
    'https://ghrupuzzle.vercel.app/api/auth/magic-link/verify?token=<single-use>&callbackURL=%2Fdashboard';
  try {
    await sendMagicLinkEmail(
      { token: 'postmark-test-token', from: 'GHRU Puzzles <test@example.org>' },
      'participant@example.org',
      signInUrl,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(payload);
  assert.equal(payload.Subject, 'Your GHRUPUZZLES sign-in link');
  assert.equal(payload.TrackLinks, 'None');
  assert.equal(payload.TrackOpens, false);
  assert.match(String(payload.TextBody), /expires in 15 minutes/);
  assert.match(String(payload.HtmlBody), /GHRUPUZZLES/);
  assert.match(String(payload.HtmlBody), /email-logo\.png/);
  assert.match(String(payload.HtmlBody), /Continue to GHRUPUZZLES/);
  assert.match(String(payload.HtmlBody), /Single-use link/);
  assert.match(String(payload.HtmlBody), /token=&lt;single-use&gt;&amp;callbackURL/);
  assert.doesNotMatch(String(payload.HtmlBody), /token=<single-use>&callbackURL/);
});

test('password-reset email sends a single-use branded recovery link', async () => {
  const originalFetch = globalThis.fetch;
  let payload: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    assert.ok(init);
    payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    return Response.json({ ErrorCode: 0, Message: 'OK', MessageID: 'reset-message-id' });
  };

  try {
    await sendPasswordResetEmail(
      { token: 'postmark-test-token', from: 'GHRU Puzzles <test@example.org>' },
      'participant@example.org',
      'https://ghrupuzzle.vercel.app/api/auth/reset-password/token?callbackURL=%2Freset-password',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(payload);
  assert.equal(payload.Subject, 'Reset your GHRUPUZZLES password');
  assert.equal(payload.Tag, 'password-reset');
  assert.match(String(payload.TextBody), /expires in one hour/);
  assert.match(String(payload.HtmlBody), /Reset password/);
  assert.match(String(payload.HtmlBody), /Single-use link/);
});

test('branded email renderer escapes challenge content', () => {
  const html = renderBrandedEmail({
    preheader: 'Challenge <1>',
    eyebrow: 'Challenge open',
    heading: 'Challenge <1>',
    introduction: 'Runs 17–31 August & ready now.',
    buttonLabel: 'Open challenge',
    buttonUrl: 'https://ghrupuzzle.vercel.app/challenge?round=1&open=true',
    noticeTitle: 'Reminder',
    notice: 'You signed up.',
    closing: 'Good luck.',
  });

  assert.match(html, /Challenge &lt;1&gt;/);
  assert.match(html, /August &amp; ready/);
  assert.match(html, /round=1&amp;open=true/);
});

test('certificate email links participants to their dashboard and public verification', async () => {
  const originalFetch = globalThis.fetch;
  let payload: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({ ErrorCode: 0, Message: 'OK', MessageID: 'certificate-message-id' });
  };

  try {
    const messageId = await sendCertificateIssuedEmail(
      { token: 'postmark-test-token', from: 'GHRU Puzzles <test@example.org>' },
      'participant@example.org',
      'Alex Participant',
      'Challenge 2',
      'https://ghrupuzzle.vercel.app/dashboard',
      'https://ghrupuzzle.vercel.app/verify/public-code',
    );
    assert.equal(messageId, 'certificate-message-id');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(payload);
  assert.equal(payload.Subject, 'Your GHRUPUZZLES Challenge 2 certificate of participation');
  assert.equal(payload.Tag, 'certificate-issued');
  assert.match(String(payload.TextBody), /Alex Participant/);
  assert.match(String(payload.TextBody), /\/dashboard/);
  assert.match(String(payload.TextBody), /\/verify\/public-code/);
  assert.match(String(payload.HtmlBody), /Certificate of participation/);
  assert.match(String(payload.HtmlBody), /View and download certificate/);
});
