'use client';

import Link from 'next/link';
import { useTherapy, clearHistory } from '../../store/therapy';

export default function HistoryPage() {
  const history = useTherapy().history;
  const newestFirst = [...history].reverse();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-2xl font-semibold text-slate-100">Session history</h1>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">
          No sessions yet.{' '}
          <Link href="/" className="text-sky-400 hover:underline">
            Pick an exercise
          </Link>{' '}
          to get started.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2">Exercise</th>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Correct</th>
                <th className="px-3 py-2">Incorrect</th>
                <th className="px-3 py-2">Percent</th>
                <th className="px-3 py-2">Level</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {newestFirst.map((r, i) => (
                <tr key={`${r.completedAt}-${i}`} className="border-t border-slate-800">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{new Date(r.completedAt).toLocaleTimeString()}</td>
                  <td className="px-3 py-2">{Math.floor(r.durationSeconds / 60)}m</td>
                  <td className="px-3 py-2 text-emerald-400">{r.score.correct}</td>
                  <td className="px-3 py-2 text-rose-400">{r.score.incorrect}</td>
                  <td className="px-3 py-2 text-sky-400">{Math.round(r.percent * 100)}%</td>
                  <td className="px-3 py-2">{r.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">
        History is kept for this browser session only.
      </p>
    </main>
  );
}
