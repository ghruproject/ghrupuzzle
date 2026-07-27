import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const PUBLIC_RELEASE_BASE =
  'https://pub-0095c1ea3d4849fd954f675d08b9dcd6.r2.dev/releases/2026-website-assembly-practice/assembly/practice';

interface PracticeRelease {
  samples: Array<{
    public_name: string;
    R1_URL: string;
    R2_URL: string;
  }>;
  answer_sheet: { species: string[] };
  sample_sheet: { url: string };
  supporting_files: Array<{ label: string; url: string }>;
}

function loadPracticeRelease(): PracticeRelease {
  return JSON.parse(
    readFileSync('public/practice_assembly_file_details.json', 'utf8'),
  ) as PracticeRelease;
}

test('short-read practice metadata uses the current public R2 release', () => {
  const release = loadPracticeRelease();

  assert.deepEqual(
    release.samples.map((sample) => sample.public_name),
    ['Sample_AP001', 'Sample_AP002', 'Sample_AP003', 'Sample_AP004'],
  );

  const readUrls = release.samples.flatMap((sample) => [sample.R1_URL, sample.R2_URL]);
  assert.equal(new Set(readUrls).size, 8);
  assert.ok(readUrls.every((url) => url.startsWith(`${PUBLIC_RELEASE_BASE}/files/`)));
  assert.equal(release.sample_sheet.url, `${PUBLIC_RELEASE_BASE}/sample_sheet.csv`);
  assert.deepEqual(release.supporting_files, [
    {
      label: 'Checksums',
      url: `${PUBLIC_RELEASE_BASE}/checksums.sha256`,
    },
  ]);
});

test('public short-read practice metadata contains no answer values', () => {
  const release = loadPracticeRelease();
  assert.deepEqual(release.answer_sheet.species, []);
});

test('obsolete static R2 helper scripts are removed', () => {
  for (const exercise of ['assembly', 'hybrid', 'outbreak', 'typing']) {
    for (const tool of ['curl', 'wget']) {
      assert.equal(existsSync(`public/practice_${exercise}-${tool}-download_samples.txt`), false);
    }
  }
});
