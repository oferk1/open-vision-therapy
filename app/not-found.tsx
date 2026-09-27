import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center font-mono">
        <div className="text-sm uppercase tracking-widest text-slate-400">404</div>
        <h1 className="mt-2 text-xl text-slate-100">Page not found</h1>
        <Link
          href="/"
          className="mt-6 inline-block rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
        >
          Back to menu
        </Link>
      </div>
    </main>
  );
}
