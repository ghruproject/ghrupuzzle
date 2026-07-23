import { ExercisePage } from '@/components/exercise-page';
import { assemblyChallengeDefinition } from '@/lib/exercise-definitions';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata(
  'Short-read assembly challenge',
  'The short-read assembly challenge exercise for signed-up participants.',
);

export default function AssemblyPage() {
  return <ExercisePage definition={assemblyChallengeDefinition} />;
}
