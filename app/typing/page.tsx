import { ExercisePage } from '@/components/exercise-page';
import { typingChallengeDefinition } from '@/lib/exercise-definitions';
import { privatePageMetadata } from '@/lib/seo';

export const metadata = privatePageMetadata(
  'Genotyping challenge',
  'The bacterial genotyping challenge exercise for signed-up participants.',
);

export default function TypingPage() {
  return <ExercisePage definition={typingChallengeDefinition} />;
}
