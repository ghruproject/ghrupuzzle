export type CourseExercise = 'assembly' | 'hybrid' | 'typing' | 'outbreak';

export interface CourseSubmission {
  exercise: CourseExercise;
  submitted_at: string;
  passed: number | null;
  earned: number | null;
  possible: number | null;
}

export interface CourseModule {
  exercise: CourseExercise;
  title: string;
  description: string;
  href: string;
  submitted: boolean;
  passed: boolean;
  latestSubmission: CourseSubmission | null;
}

const MODULES: Array<Omit<CourseModule, 'submitted' | 'passed' | 'latestSubmission'>> = [
  {
    exercise: 'assembly',
    title: 'Short-read assembly',
    description: 'Assembly, contamination detection, and structured QC reporting.',
    href: '/assembly/practice',
  },
  {
    exercise: 'hybrid',
    title: 'Hybrid assembly',
    description: 'Hybrid assembly, polishing, circularisation, and completeness.',
    href: '/hybrid-assembly/practice',
  },
  {
    exercise: 'typing',
    title: 'Genotyping',
    description: 'Sequence type, locus, serotype, species, and resistance calls.',
    href: '/typing/practice',
  },
  {
    exercise: 'outbreak',
    title: 'Outbreak analysis',
    description: 'Mapping, variants, phylogeny, and outbreak cluster interpretation.',
    href: '/outbreak/practice',
  },
];

export function buildCourseModules(submissions: CourseSubmission[]): CourseModule[] {
  return MODULES.map((module) => {
    const latestSubmission =
      submissions
        .filter((submission) => submission.exercise === module.exercise)
        .sort(
          (left, right) =>
            new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime(),
        )[0] ?? null;
    return {
      ...module,
      submitted: latestSubmission !== null,
      passed: latestSubmission?.passed === 1,
      latestSubmission,
    };
  });
}
