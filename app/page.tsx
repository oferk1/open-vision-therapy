import Link from 'next/link';
import ExerciseMenu from '../components/ExerciseMenu';

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="font-mono text-2xl font-semibold text-slate-100">
          Vision Therapy — HTS2 Modes
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Client-side red/cyan anaglyph therapy suite. Put on your glasses before starting any
          stereo exercise.
        </p>
      </header>

      <ExerciseMenu />

      <p className="mt-6 text-xs text-slate-500">
        Results are summarized in{' '}
        <Link href="/history" className="text-sky-400 hover:underline">
          History
        </Link>{' '}
        for this browser session.
      </p>
    </main>
  );
}
