import assert from 'node:assert/strict';
import test from 'node:test';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import { publicPageMetadata, SITE_URL } from '../lib/seo';

test('public metadata uses the canonical production origin and large social cards', () => {
  const metadata = publicPageMetadata({
    title: 'Practice',
    description: 'Practice description',
    path: '/practice',
  });

  assert.equal(metadata.alternates?.canonical, '/practice');
  assert.equal(metadata.openGraph?.url, '/practice');
  assert.ok(metadata.twitter && 'card' in metadata.twitter);
  assert.equal(metadata.twitter.card, 'summary_large_image');
  assert.deepEqual(metadata.twitter.images, ['/twitter-image']);
});

test('sitemap contains public practice and guide pages but excludes account routes', () => {
  const urls = sitemap().map((entry) => entry.url);

  assert.ok(urls.includes(new URL('/assembly/practice', SITE_URL).toString()));
  assert.ok(!urls.includes(new URL('/practice', SITE_URL).toString()));
  assert.ok(urls.includes(new URL('/guides/installing-tools', SITE_URL).toString()));
  assert.ok(!urls.some((url) => url.includes('/dashboard')));
  assert.ok(!urls.some((url) => url.includes('/sign-in')));
});

test('robots blocks private and API routes and advertises the sitemap', () => {
  const policy = robots();
  const rules = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;

  assert.ok(rules?.disallow?.includes('/api/'));
  assert.ok(rules?.disallow?.includes('/dashboard'));
  assert.equal(policy.sitemap, new URL('/sitemap.xml', SITE_URL).toString());
});
