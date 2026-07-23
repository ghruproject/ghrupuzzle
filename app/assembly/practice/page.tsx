import { ExercisePage } from '@/components/exercise-page';
import { assemblyPracticeDefinition } from '@/lib/exercise-definitions';
import { publicPageMetadata } from '@/lib/seo';

export const metadata = publicPageMetadata({
  title: 'Short-read assembly practice',
  description:
    'Test short-read bacterial genome assembly, contamination detection and structured quality-control reporting with simulated data.',
  path: '/assembly/practice',
  keywords: ['short-read assembly exercise', 'bacterial genome assembly QC'],
});

export default function AssemblyPracticePage() {
  return <ExercisePage definition={assemblyPracticeDefinition} />;
}
