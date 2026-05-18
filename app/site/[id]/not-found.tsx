import Link from 'next/link';
import Header from '../../components/Header';

export default function NotFound() {
  return (
    <main className="flex-1">
      <Header />
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Site not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          That site isn't in our catalog. It may have been removed, or the link could be a typo.
        </p>
        <Link href="/" className="inline-block mt-4 px-4 py-2 rounded bg-slate-900 text-white no-underline">
          Back to map
        </Link>
      </div>
    </main>
  );
}
