'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EXERCISE_MAP } from '../lib/exercises';
import type { ExerciseId, ExerciseResult } from '../lib/types';
import { useTherapy } from '../store/therapy';

export default function ResultsPageClient({ id }: { id: ExerciseId }) {
  const router = useRouter();
  const result: ExerciseResult | null = useTherapy().lastResult;
  const meta = EXERCISE_MAP[id];

  if (!result || result.id !== id) {
    // Direct load without a completed run: point back to setup.
    return (
      <main className="grid min-h-screen place-items-center px-4 font-mono">
        <div className="text-center">
          <div className="text-sm uppercase tracking-widest text-slate-400">No results yet</div>
          <p className="mt-2 text-sm text-slate-400">
            Finish a {meta.name} session to see its summary here.
          </p>
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

  const total = result.score.correct + result.score.incorrect;

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-8 font-mono">
        <div className="text-sm uppercase tracking-widest text-slate-400">Session complete</div>
        <h1 className="mt-1 text-xl font-semibold text-slate-100">{result.name}</h1>
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <span className="text-slate-400">Correct</span>
          <span className="text-emerald-400">{result.score.correct}</span>
          <span className="text-slate-400">Incorrect</span>
          <span className="text-rose-400">{result.score.incorrect}</span>
          <span className="text-slate-400">Total responses</span>
          <span>{total}</span>
          <span className="text-slate-400">Percent correct</span>
          <span className="text-sky-400">{Math.round(result.percent * 100)}%</span>
          <span className="text-slate-400">Time completed</span>
          <span>
            {Math.floor(result.durationSeconds / 60)}m {result.durationSeconds % 60}s
          </span>
          <span className="text-slate-400">Level reached</span>
          <span>{result.level}</span>
        </div>
        <div className="mt-8 flex gap-2">
          <Link
            href="/"
            className="flex-1 rounded border border-slate-700 px-4 py-2 text-center text-sm text-slate-300 hover:bg-slate-800"
          >
            Back to Menu
          </Link>
          <Link
            href={`/exercise/${id}`}
            className="flex-1 rounded bg-sky-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-sky-500"
          >
            Run again
          </Link>
        </div>
      </div>
    </main>
  );
}
