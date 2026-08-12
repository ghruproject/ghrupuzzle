import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routeSource = readFileSync(
  new URL('../app/api/admin/releases/[id]/answers/route.ts', import.meta.url),
  'utf8',
);
const dashboardSource = readFileSync(
  new URL('../components/admin-dashboard.tsx', import.meta.url),
  'utf8',
);

test('dataset release table links administrators to registered answer keys', () => {
  assert.match(dashboardSource, /\/api\/admin\/releases\/\$\{encodeURIComponent\(release\.id\)\}\/answers/);
  assert.match(dashboardSource, /View answers →/);
  assert.doesNotMatch(dashboardSource, />Answers<\/th>/);
  assert.match(dashboardSource, /target="_blank"/);
});

test('answer-key endpoint is administrator-only and never presigns private data', () => {
  assert.match(routeSource, /requireUser\(request\)/);
  assert.match(routeSource, /requireRole\(env\.DB, actor, \['administrator'\]\)/);
  assert.match(routeSource, /env\.PRIVATE_ASSETS\.get\(release\.answer_key\)/);
  assert.doesNotMatch(routeSource, /presign/i);
  assert.match(routeSource, /'cache-control': 'private, no-store'/);
  assert.match(routeSource, /'release\.answers_viewed'/);
});
