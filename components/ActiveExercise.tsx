'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { beepEnd, beepStart, primeAudio } from '../lib/audio';
import { EXERCISE_MAP } from '../lib/exercises';
import type { ArrowDir, EngineHandles, EngineProps, EngineStats, ExerciseId } from '../lib/types';
import { fmtClock } from '../lib/utils';
import ExerciseScene from './ExerciseScene';

const AnaglyphCanvas = dynamic(() => import('./AnaglyphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center text-slate-400">Loading 3D…</div>
  ),
});

const KEY_TO_DIR: Record<string, ArrowDir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

interface ActiveExerciseProps {
  id: ExerciseId;
  durationMinutes: number;
  baseDepth: number;
  speed: number;
  onFinish: (stats: EngineStats, elapsedSeconds: number, level: number) => void;
  onExitEarly: () => void;
}

type Phase = 'preroll' | 'running' | 'finished';

export default function ActiveExercise({
  id,
  durationMinutes,
  baseDepth,
  speed,
  onFinish,
  onExitEarly,
}: ActiveExerciseProps) {
  const meta = EXERCISE_MAP[id];
  const totalSeconds = durationMinutes * 60;

  const [phase, setPhase] = useState<Phase>('preroll');
  const [prerollLeft, setPrerollLeft] = useState(3);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [stats, setStats] = useState<EngineStats>({
    score: { correct: 0, incorrect: 0, total: 0 },
    level: 1,
  });

  const statsRef = useRef<EngineStats>({
    score: { correct: 0, incorrect: 0, total: 0 },
    level: 1,
  });
  const inputRef = useRef<EngineHandles | null>(null);
  const eyeOffsetRef = useRef(0);
  const enabledRef = useRef(false);
  const startedAtRef = useRef(0);

  const engineProps: EngineProps = useMemo(
    () => ({
      settings: { durationMinutes, baseDepth, speed },
      running: phase === 'running',
      statsRef,
      inputRef,
      eyeOffsetRef,
      onStats: setStats,
    }),
    [phase, durationMinutes, baseDepth, speed]
  );

  // Pre-roll countdown, then run.
  useEffect(() => {
    if (phase !== 'preroll') return;
    primeAudio();
    if (prerollLeft <= 0) {
      beepStart();
      startedAtRef.current = Date.now();
      setPhase('running');
      return;
    }
    const t = window.setTimeout(() => setPrerollLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(t);
  }, [phase, prerollLeft]);

  // Gate canvas rendering with the running phase.
  useEffect(() => {
    enabledRef.current = phase === 'running';
  }, [phase]);

  // Main countdown.
  useEffect(() => {
    if (phase !== 'running') return;
    const iv = window.setInterval(() => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(iv);
        setPhase('finished');
      }
    }, 200);
    return () => window.clearInterval(iv);
  }, [phase, totalSeconds]);

  // Finish on timer end.
  useEffect(() => {
    if (phase !== 'finished') return;
    beepEnd();
    const elapsed = Math.min(
      totalSeconds,
      Math.max(0, (Date.now() - startedAtRef.current) / 1000)
    );
    onFinish(statsRef.current, Math.round(elapsed), statsRef.current.level);
  }, [phase, totalSeconds, onFinish]);

  // Keyboard handling: arrows to respond, Esc to exit early.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (phase === 'running' || phase === 'preroll') onExitEarly();
        return;
      }
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      if (phase !== 'running') return;
      inputRef.current?.respond(dir);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, onExitEarly]);

  const percent = stats.score.total > 0 ? stats.score.correct / stats.score.total : 0;

  return (
    <div className="fixed inset-0 select-none bg-[#05070a]">
      <AnaglyphCanvas eyeOffsetRef={eyeOffsetRef} enabledRef={enabledRef}>
        <ExerciseScene id={id} engineProps={engineProps} />
      </AnaglyphCanvas>

      {/* HUD — solid chips so it stays readable over the speckle field */}
      <div className="pointer-events-none fixed inset-0 p-4 font-mono text-slate-100">
        <div className="flex items-start justify-between">
          <div className="space-y-1 rounded-lg bg-black/70 px-3 py-2 text-sm leading-6 ring-1 ring-white/10">
            <div className="text-xs uppercase tracking-widest text-slate-300">{meta.name}</div>
            <div>
              Correct: <span className="text-emerald-400">{stats.score.correct}</span>
            </div>
            <div>
              Incorrect: <span className="text-rose-400">{stats.score.incorrect}</span>
            </div>
            <div>
              Percent: <span className="text-sky-300">{Math.round(percent * 100)}%</span>
            </div>
          </div>
          <div className="space-y-1 rounded-lg bg-black/70 px-3 py-2 text-right text-sm leading-6 ring-1 ring-white/10">
            <div className="text-xs uppercase tracking-widest text-slate-300">Time</div>
            <div className="text-2xl">{fmtClock(remaining)}</div>
            <div className="text-xs text-slate-300">Esc to exit early</div>
            <div className="text-xs text-slate-400">Level {stats.level}</div>
          </div>
        </div>
      </div>

      {phase === 'preroll' && (
        <div className="fixed inset-0 grid place-items-center bg-black/70">
          <div className="text-center font-mono text-slate-200">
            <div className="text-sm uppercase tracking-widest text-slate-400">Get ready</div>
            <div className="mt-2 text-6xl">{prerollLeft > 0 ? prerollLeft : 'Go'}</div>
            <div className="mt-4 text-sm text-slate-400">
              Put on your red/cyan glasses. Answer with {meta.controls}.
            </div>
          </div>
          <button
            className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 rounded border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            onClick={onExitEarly}
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'finished' && (
        <div className="fixed inset-0 grid place-items-center bg-black/80">
          <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-8 font-mono text-slate-200">
            <div className="text-sm uppercase tracking-widest text-slate-400">Session complete</div>
            <div className="mt-4 grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              <span className="text-slate-400">Correct</span>
              <span className="text-emerald-400">{stats.score.correct}</span>
              <span className="text-slate-400">Incorrect</span>
              <span className="text-rose-400">{stats.score.incorrect}</span>
              <span className="text-slate-400">Percent</span>
              <span className="text-sky-400">{Math.round(percent * 100)}%</span>
              <span className="text-slate-400">Level</span>
              <span>{stats.level}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
