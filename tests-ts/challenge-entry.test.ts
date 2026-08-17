import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const challengePage = readFileSync('app/challenge/page.tsx', 'utf8');
const challengeBanner = readFileSync('components/challenge-banner.tsx', 'utf8');
const roundList = readFileSync('components/round-list.tsx', 'utf8');

test('challenge page uses the server session and active enrolment', () => {
  assert.match(challengePage, /createAuth\(\)/);
  assert.match(challengePage, /FROM enrolment/);
  assert.match(challengePage, /enrolment\?\.status === 'active'/);
  assert.match(challengePage, /id=.*challenge-exercises/);
});

test('signed-up challenge entry points lead to the exercise chooser', () => {
  assert.match(challengeBanner, /'\/challenge#challenge-exercises'/);
  assert.match(roundList, /href="\/challenge#challenge-exercises"/);
  assert.match(challengePage, /href=\{exercise\.challengeHref\}/);
  assert.match(challengePage, /Choose a challenge exercise below/);
  assert.doesNotMatch(challengePage, /href="#challenge-exercises"/);
  assert.match(challengeBanner, /isOpen && pathname === '\/challenge'/);
  assert.doesNotMatch(challengeBanner, /signedUp && isOpen\s*\? '\/challenge'/);
});

test('closing the challenge banner lasts only for the current browser session', () => {
  assert.match(challengeBanner, /window\.sessionStorage\.getItem/);
  assert.match(challengeBanner, /window\.sessionStorage\.setItem/);
  assert.doesNotMatch(challengeBanner, /window\.localStorage/);
});
