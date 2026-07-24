import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCourseModules, type CourseSubmission } from '../lib/course-progress';

test('course progress follows the selected practice or challenge mode', () => {
  const submissions: CourseSubmission[] = [
    {
      exercise: 'assembly',
      mode: 'practice',
      submitted_at: '2026-07-20T10:00:00Z',
      passed: 0,
      earned: 4,
      possible: 10,
    },
    {
      exercise: 'assembly',
      mode: 'challenge',
      submitted_at: '2026-07-21T10:00:00Z',
      passed: 1,
      earned: 9,
      possible: 10,
    },
    {
      exercise: 'typing',
      mode: 'practice',
      submitted_at: '2026-07-22T10:00:00Z',
      passed: null,
      earned: null,
      possible: null,
    },
  ];

  const practiceModules = buildCourseModules(submissions);
  assert.equal(practiceModules.length, 4);
  assert.equal(practiceModules.filter((module) => module.submitted).length, 2);
  assert.equal(
    practiceModules.find((module) => module.exercise === 'assembly')?.passed,
    false,
  );
  assert.equal(
    practiceModules.find((module) => module.exercise === 'assembly')
      ?.latestSubmission?.earned,
    4,
  );
  assert.equal(
    practiceModules.find((module) => module.exercise === 'assembly')
      ?.practiceSubmitted,
    true,
  );
  assert.equal(
    practiceModules.find((module) => module.exercise === 'assembly')
      ?.challengeSubmitted,
    true,
  );
  assert.equal(
    practiceModules.find((module) => module.exercise === 'hybrid')?.submitted,
    false,
  );

  const challengeModules = buildCourseModules(submissions, 'challenge');
  assert.equal(challengeModules.filter((module) => module.submitted).length, 1);
  assert.equal(
    challengeModules.find((module) => module.exercise === 'assembly')?.passed,
    true,
  );
  assert.equal(
    challengeModules.find((module) => module.exercise === 'assembly')
      ?.latestSubmission?.earned,
    9,
  );
});
