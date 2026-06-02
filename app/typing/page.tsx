import { ExercisePage } from '@/components/exercise-page';
import { typingChallengeDefinition } from '@/lib/exercise-definitions';

export default function TypingPage() {
  return <ExercisePage definition={typingChallengeDefinition} />;
}
