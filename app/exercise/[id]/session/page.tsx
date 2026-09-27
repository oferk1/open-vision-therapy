import { notFound } from 'next/navigation';
import ActiveExercisePageClient from '../../../../components/ActiveExercisePageClient';
import { EXERCISE_IDS, EXERCISE_MAP, isExerciseId } from '../../../../lib/exercises';

export function generateStaticParams() {
  return EXERCISE_IDS.map((id) => ({ id }));
}

export default async function SessionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  if (!isExerciseId(id)) notFound();
  const meta = EXERCISE_MAP[id];

  return <ActiveExercisePageClient id={meta.id} />;
}
