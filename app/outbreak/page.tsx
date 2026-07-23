import { ExercisePage } from '@/components/exercise-page';
import { outbreakChallengeDefinition } from '@/lib/exercise-definitions';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata(
  'Outbreak analysis challenge',
  'The outbreak analysis challenge exercise for signed-up participants.',
);

export default function OutbreakPage() {
  return <ExercisePage definition={outbreakChallengeDefinition} />;
}
