import { ExercisePage } from '@/components/exercise-page';
import { assemblyPracticeDefinition } from '@/lib/exercise-definitions';

export default function AssemblyPracticePage() {
  return <ExercisePage definition={assemblyPracticeDefinition} />;
}
