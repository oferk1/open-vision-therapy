import { notFound } from 'next/navigation';
import ExerciseConfigForm from '../../../components/ExerciseConfigForm';
import { EXERCISE_IDS, EXERCISE_MAP, isExerciseId } from '../../../lib/exercises';

export function generateStaticParams() {
  return EXERCISE_IDS.map((id) => ({ id }));
}

export default async function ConfigPage({ params }: { params: { id: string } }) {
  const { id } = params;
  if (!isExerciseId(id)) notFound();
  const meta = EXERCISE_MAP[id];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <ExerciseConfigForm id={meta.id} />
    </main>
  );
}
