export type CourseExercise = 'assembly' | 'hybrid' | 'typing' | 'outbreak';
export type SubmissionMode = 'practice' | 'challenge';

export interface CourseSubmission {
  exercise: CourseExercise;
  mode: SubmissionMode;
  submitted_at: string;
  passed: number | null;
  earned: number | null;
  possible: number | null;
}

export interface CourseModule {
  exercise: CourseExercise;
  title: string;
  description: string;
  practiceHref: string;
  challengeHref: string;
  submitted: boolean;
  passed: boolean;
  latestSubmission: CourseSubmission | null;
  practiceSubmitted: boolean;
  challengeSubmitted: boolean;
}

const MODULES: Array<
  Omit<
    CourseModule,
    'submitted' | 'passed' | 'latestSubmission' | 'practiceSubmitted' | 'challengeSubmitted'
  >
> = [
  {
    exercise: 'assembly',
    title: 'Short-read assembly',
    description: 'Assembly, contamination detection and structured QC reporting.',
    practiceHref: '/assembly/practice',
    challengeHref: '/assembly',
  },
  {
    exercise: 'hybrid',
    title: 'Hybrid assembly',
    description: 'Hybrid assembly, polishing, circularisation and completeness.',
    practiceHref: '/hybrid-assembly/practice',
    challengeHref: '/hybrid-assembly',
  },
  {
    exercise: 'typing',
    title: 'Genotyping',
    description: 'Sequence type, locus, serotype, species and resistance calls.',
    practiceHref: '/typing/practice',
    challengeHref: '/typing',
  },
  {
    exercise: 'outbreak',
    title: 'Outbreak analysis',
    description: 'Mapping, variants, phylogeny and outbreak cluster interpretation.',
    practiceHref: '/outbreak/practice',
    challengeHref: '/outbreak',
  },
];

export function buildCourseModules(submissions: CourseSubmission[]): CourseModule[] {
  return MODULES.map((module) => {
    const exerciseSubmissions = submissions
      .filter((submission) => submission.exercise === module.exercise)
      .sort(
        (left, right) =>
          new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime(),
      );
    const latestSubmission = exerciseSubmissions[0] ?? null;
    return {
      ...module,
      submitted: latestSubmission !== null,
      passed: exerciseSubmissions.some((submission) => submission.passed === 1),
      latestSubmission,
      practiceSubmitted: exerciseSubmissions.some((submission) => submission.mode === 'practice'),
      challengeSubmitted: exerciseSubmissions.some((submission) => submission.mode === 'challenge'),
    };
  });
}
