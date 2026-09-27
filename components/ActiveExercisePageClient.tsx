'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import ActiveExercise from './ActiveExercise';
import type { ExerciseResult, ExerciseSettings } from '../lib/types';
import type { EngineStats } from '../lib/types';
import { useTherapy, finishSession, exitEarly } from '../store/therapy';

/**
 * Bridges the running session to routing: finishes navigate to the results
 * route; an early exit navigates back to the config page.
 */
export default function ActiveExercisePageClient({ id }: { id: string }) {
  const router = useRouter();
  const { session } = useTherapy();

  function handleFinish(stats: EngineStats, elapsed: number, level: number) {
    if (!session) return;
    const total = stats.score.correct + stats.score.incorrect;
    const result: ExerciseResult = {
      id: session.id,
      name: '',
      completedAt: Date.now(),
      durationSeconds: elapsed,
      score: stats.score,
      percent: total > 0 ? stats.score.correct / total : 0,
      level,
    };
    finishSession(result);
    router.replace(`/exercise/${session.id}/results`);
  }

  const handleExitEarly = useCallback(() => {
    exitEarly();
    router.replace(`/exercise/${id}`);
  }, [exitEarly, id, router]);

  if (!session || session.id !== id) {
    // Direct load of /session without starting (or a stale session for a
    // different exercise): offer to configure instead of a blank screen.
    return (
      <main className="grid min-h-screen place-items-center px-4 font-mono">
        <div className="text-center">
          <div className="text-sm uppercase tracking-widest text-slate-400">
            No session running
          </div>
          <button
            onClick={() => router.replace(`/exercise/${id}`)}
            className="mt-6 rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
          >
            Go to setup
          </button>
        </div>
      </main>
    );
  }

  const settings: ExerciseSettings = session.settings;

  return (
    <ActiveExercise
      key={session.runKey}
      id={id as Parameters<typeof ActiveExercise>[0]['id']}
      durationMinutes={settings.durationMinutes}
      baseDepth={settings.baseDepth}
      speed={settings.speed}
      onFinish={handleFinish}
      onExitEarly={handleExitEarly}
    />
  );
}
