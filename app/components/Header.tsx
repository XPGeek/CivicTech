import Link from 'next/link';

export default function Header() {
  return (
    <header
      className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200"
      role="banner"
    >
      <div className="max-w-6xl mx-auto h-14 flex items-center px-4 gap-3">
        <Link href="/" className="font-semibold text-slate-900 no-underline">
          DMV Water Watch
        </Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/methodology" className="text-slate-700 no-underline hover:underline">
            Methodology
          </Link>
          <Link href="/sources" className="text-slate-700 no-underline hover:underline">
            Sources
          </Link>
          <Link href="/about" className="text-slate-700 no-underline hover:underline">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
