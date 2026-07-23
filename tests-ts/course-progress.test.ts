import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCourseModules, type CourseSubmission } from '../lib/course-progress';

test('course progress marks submitted modules and keeps the latest attempt', () => {
  const submissions: CourseSubmission[] = [
    {
      exercise: 'assembly',
      submitted_at: '2026-07-20T10:00:00Z',
      passed: 0,
      earned: 4,
      possible: 10,
    },
    {
      exercise: 'assembly',
      submitted_at: '2026-07-21T10:00:00Z',
      passed: 1,
      earned: 9,
      possible: 10,
    },
    {
      exercise: 'typing',
      submitted_at: '2026-07-22T10:00:00Z',
      passed: null,
      earned: null,
      possible: null,
    },
  ];

  const modules = buildCourseModules(submissions);
  assert.equal(modules.length, 4);
  assert.equal(modules.filter((module) => module.submitted).length, 2);
  assert.equal(modules.find((module) => module.exercise === 'assembly')?.passed, true);
  assert.equal(
    modules.find((module) => module.exercise === 'assembly')?.latestSubmission?.earned,
    9,
  );
  assert.equal(modules.find((module) => module.exercise === 'hybrid')?.submitted, false);
});
