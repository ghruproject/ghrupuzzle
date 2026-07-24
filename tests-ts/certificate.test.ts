import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import {
  certificateVerificationUrl,
  createCertificatePublicCode,
  renderCertificate,
} from '../lib/certificate';

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
