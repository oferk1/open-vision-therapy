'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { defaultSettings, EXERCISE_MAP } from '../lib/exercises';
import type { ExerciseId, ExerciseSettings } from '../lib/types';
import { startSession } from '../store/therapy';

const DURATION_CHOICES = [3, 5, 7];

export default function ExerciseConfigForm({ id }: { id: ExerciseId }) {
  const meta = EXERCISE_MAP[id];
  const defaults = defaultSettings(meta);
  const router = useRouter();

  const [minutes, setMinutes] = useState(defaults.durationMinutes);
  const [speed, setSpeed] = useState(defaults.speed);
  const [baseDepth, setBaseDepth] = useState(defaults.baseDepth);

  function buildSettings(): ExerciseSettings {
    return { durationMinutes: minutes, baseDepth, speed };
  }

  function handleStart() {
    startSession(id, buildSettings());
    router.push(`/exercise/${id}/session`);
  }

  // Keyboard: Enter starts, Esc returns to the menu.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') router.push('/');
      if (e.key === 'Enter') handleStart();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes, speed, baseDepth, router]);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-xl font-semibold text-slate-100">{meta.name}</h1>
        {meta.stereo && (
          <span className="rounded bg-sky-900/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-sky-300">
            Stereo
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-400">{meta.blurb}</p>

      <label className="mt-8 block text-xs uppercase tracking-widest text-slate-400">
        Duration (minutes)
      </label>
      <div className="mt-2 flex gap-2">
        {DURATION_CHOICES.map((m) => (
          <button
            key={m}
            onClick={() => setMinutes(m)}
            className={`flex-1 rounded border px-3 py-2 font-mono text-sm ${
              minutes === m
                ? 'border-sky-500 bg-sky-950 text-sky-300'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {m}
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={30}
          value={minutes}
          onChange={(e) =>
            setMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))
          }
          className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-2 text-center font-mono text-sm text-slate-200"
        />
      </div>

      <label className="mt-6 block text-xs uppercase tracking-widest text-slate-400">
        Speed ×{speed.toFixed(2)}
      </label>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.05}
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="mt-2 w-full accent-sky-500"
      />

      {meta.stereo && (
        <>
          <label className="mt-6 block text-xs uppercase tracking-widest text-slate-400">
            Stereo demand {baseDepth.toFixed(2)}
          </label>
          <input
            type="range"
            min={0.1}
            max={0.8}
            step={0.05}
            value={baseDepth}
            onChange={(e) => setBaseDepth(Number(e.target.value))}
            className="mt-2 w-full accent-sky-500"
          />
        </>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Respond with {meta.controls}. Esc exits the session early.
      </p>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/"
          className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Back to menu
        </Link>
        <button
          onClick={handleStart}
          className="rounded bg-sky-600 px-6 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Start session
        </button>
      </div>
    </div>
  );
}
