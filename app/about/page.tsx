import Link from 'next/link';
import Header from '../components/Header';
import Disclaimer from '../components/Disclaimer';

export const metadata = {
  title: 'About — DMV Water Watch',
  description: 'Credits, data sources, and contact information.',
};

export default function AboutPage() {
  return (
    <main className="flex-1">
      <Header />
      <article className="max-w-2xl mx-auto p-4 prose prose-slate prose-sm sm:prose-base">
        <h1>About DMV Water Watch</h1>
        <p>
          DMV Water Watch is a mobile-first map that answers one question for paddlers, rowers,
          and (where legal) swimmers across the inner DC Metro Area: <em>is it safe to get in
          the water today?</em>
        </p>
        <p>
          We unify bacterial sampling, real-time sondes, USGS streamflow, EPA impairment status,
          and NOAA rainfall into a single traffic-light report card per recreation site. The
          system is fully open source, MIT licensed, and built in the civic-tech tradition: the
          full architecture, rubric, and data attributions are public from day one.
        </p>

        <h2>Data sources</h2>
        <p>
          See the <Link href="/sources">Sources page</Link> for per-source last-updated
          timestamps. The full data-source catalog with API endpoints and licensing lives in
          our repo's <code>DATA_SOURCES.md</code>.
        </p>

        <h2>How grades are computed</h2>
        <p>
          See the <Link href="/methodology">methodology page</Link> for a plain-English
          explanation of our rubric. The full specification is in <code>GRADING.md</code> in our
          repo.
        </p>

        <h2>Open source</h2>
        <p>
          The full source code and roadmap is open at our public repository. Contributions —
          new data sources, new sites, copy edits — are welcome via pull request. See{' '}
          <code>CONTRIBUTING.md</code> in the repo for the developer guide.
        </p>

        <h2>Acknowledgments</h2>
        <p>
          This project is part of Civic Tech DC's project nights and exists because of the
          public data that USGS, EPA, NOAA, DC DOEE, the Anacostia Riverkeeper, and the
          Potomac Riverkeeper Network make freely available. We aim to be a credible consumer
          surface for the work those organizations do.
        </p>

        <h2>Contact</h2>
        <p>
          For feedback, corrections, or partnership inquiries, please open an issue on our
          repository or reach out via the contact form on our project page.
        </p>

        <Disclaimer />
      </article>
    </main>
  );
}
