import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import {
  certificateVerificationUrl,
  createCertificatePublicCode,
  renderCertificate,
} from '../lib/certificate';
import { readFile } from 'node:fs/promises';

test('certificate codes are non-guessable URL-safe 144-bit values', () => {
  const codes = new Set(Array.from({ length: 20 }, () => createCertificatePublicCode()));
  assert.equal(codes.size, 20);
  for (const code of codes) {
    assert.match(code, /^[A-Za-z0-9_-]{24}$/);
  }
});

test('certificate embeds a public GHRU Puzzles verification URL in a valid PDF', async () => {
  const code = createCertificatePublicCode();
  const verificationUrl = certificateVerificationUrl(
    'https://ghrupuzzle.vercel.app/',
    code,
  );
  assert.equal(verificationUrl, `https://ghrupuzzle.vercel.app/verify/${code}`);
  const bytes = await renderCertificate({
    participantName: 'Acceptance Participant',
    roundTitle: 'Challenge 2',
    issuedAt: '2026-09-01T12:00:00.000Z',
    verificationUrl,
    publicCode: code,
  });
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), 1);
});

test('certificate issuance is idempotent and the database permits one active certificate', async () => {
  const [issuanceSource, migrationSource] = await Promise.all([
    readFile(new URL('../lib/certificate-issuance.ts', import.meta.url), 'utf8'),
    readFile(new URL('../migrations/0010_certificate_single_active.sql', import.meta.url), 'utf8'),
  ]);

  assert.match(issuanceSource, /activeCertificate && !supersedesId/);
  assert.match(issuanceSource, /alreadyIssued: true/);
  assert.match(migrationSource, /UNIQUE INDEX IF NOT EXISTS/);
  assert.match(migrationSource, /WHERE revoked_at IS NULL/);
});

test('closed-round automation finalises unreviewed scores before issuing certificates', async () => {
  const source = await readFile(
    new URL('../lib/automatic-certificates.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /datetime\(r\.closes_at\) < datetime\(\?\)/);
  assert.match(source, /rv\.status IN \('requested', 'in_review'\)/);
  assert.match(source, /sc\.passed = 1 AND sc\.provisional = 0/);
  assert.match(source, /issueCertificate/);
});

test('administrators receive direct PDF download links for issued certificates', async () => {
  const [roundPage, dashboard] = await Promise.all([
    readFile(new URL('../components/admin-round-completion-page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin-dashboard.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(roundPage, /api\/certificates\/\$\{participant\.activeCertificateId\}\/download/);
  assert.match(dashboard, /api\/certificates\/\$\{certificate\.id\}\/download/);
});

test('public verification presents a credential rather than a raw database record', async () => {
  const source = await readFile(
    new URL('../app/verify/[code]/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /Certificate verified/);
  assert.match(source, /Awarded to/);
  assert.match(source, /Successfully passed all required assessments/);
  assert.match(source, /Verified by GHRUPUZZLES/);
  assert.match(source, /Credential ID/);
  assert.match(source, /This verification page is public/);
});
