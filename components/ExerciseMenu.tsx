'use client';

import Link from 'next/link';
import { EXERCISES } from '../lib/exercises';

export default function ExerciseMenu() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {EXERCISES.map((ex) => (
        <Link
          key={ex.id}
          href={`/exercise/${ex.id}`}
          className="rounded-lg border border-slate-700 bg-slate-900 p-4 transition hover:border-sky-500 hover:bg-slate-800"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-base font-semibold text-slate-100">{ex.name}</span>
            {ex.stereo && (
              <span className="rounded bg-sky-900/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-sky-300">
                Stereo
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-400">{ex.blurb}</p>
          <p className="mt-3 text-xs text-slate-500">
            Default {ex.defaultMinutes} min · {ex.controls}
          </p>
        </Link>
      ))}
    </div>
  );
}
