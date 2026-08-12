import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  privateFileId,
  safePrivateContentType,
  safePrivateFileName,
} from '../lib/admin-release-details';

const routeSource = readFileSync(
  new URL('../app/api/admin/releases/[id]/answers/route.ts', import.meta.url),
  'utf8',
);
const dashboardSource = readFileSync(
  new URL('../components/admin-dashboard.tsx', import.meta.url),
  'utf8',
);
const pageSource = readFileSync(
  new URL('../app/admin/releases/[id]/page.tsx', import.meta.url),
  'utf8',
);
const privateFileRouteSource = readFileSync(
  new URL('../app/api/admin/releases/[id]/private-files/[fileId]/route.ts', import.meta.url),
  'utf8',
);

test('dataset release table links administrators to private release details', () => {
  assert.match(dashboardSource, /\/admin\/releases\/\$\{encodeURIComponent\(release\.id\)\}/);
  assert.match(dashboardSource, /Release details →/);
  assert.doesNotMatch(dashboardSource, /\/api\/admin\/releases\/\$\{encodeURIComponent\(release\.id\)\}\/answers/);
});

test('answer-key endpoint is administrator-only and never presigns private data', () => {
  assert.match(routeSource, /requireUser\(request\)/);
  assert.match(routeSource, /requireRole\(env\.DB, actor, \['administrator'\]\)/);
  assert.match(routeSource, /env\.PRIVATE_ASSETS\.get\(release\.answerKey\)/);
  assert.doesNotMatch(routeSource, /presign/i);
  assert.match(routeSource, /'cache-control': 'private, no-store'/);
  assert.match(routeSource, /'release\.answers_downloaded'/);
  assert.match(routeSource, /'release\.answers_viewed'/);
  assert.match(routeSource, /content-security-policy/);
});

test('release details require administrator access and deliberately reveal answers', () => {
  assert.match(pageSource, /hasAdministratorAccess/);
  assert.match(pageSource, /Administrator only/);
  assert.match(pageSource, /<AdminAnswerReveal releaseId=\{release\.id\}/);
  assert.match(pageSource, /Private files/);
  assert.match(pageSource, /release\.details_viewed/);
  assert.match(pageSource, /Reveal above/);
});

test('private file delivery resolves opaque identifiers within the registered prefix', () => {
  assert.match(privateFileRouteSource, /requireRole\(env\.DB, actor, \['administrator'\]\)/);
  assert.match(privateFileRouteSource, /findAdminPrivateFile/);
  assert.match(privateFileRouteSource, /release\.privatePrefix/);
  assert.doesNotMatch(privateFileRouteSource, /presign/i);
  assert.match(privateFileRouteSource, /'cache-control': 'private, no-store'/);
  assert.match(privateFileRouteSource, /content-security-policy/);
});

test('private file identifiers and response metadata are safe and deterministic', async () => {
  assert.equal(await privateFileId('provenance.json'), await privateFileId('provenance.json'));
  assert.notEqual(await privateFileId('provenance.json'), await privateFileId('answer_key.json'));
  assert.match(await privateFileId('nested/tool-output.txt'), /^[a-f0-9]{32}$/);
  assert.equal(safePrivateContentType('report.json'), 'application/json; charset=utf-8');
  assert.equal(safePrivateContentType('report.html'), 'application/octet-stream');
  assert.equal(safePrivateFileName('../bad name.html'), 'bad_name.html');
});
