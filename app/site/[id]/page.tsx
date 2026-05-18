import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadInitialData, listSiteIds } from '@lib/data-source';
import DetailCard from '../../components/DetailCard';
import Disclaimer from '../../components/Disclaimer';
import Header from '../../components/Header';

export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams() {
  return listSiteIds().map((id) => ({ id }));
}

interface Props {
  params: { id: string };
}

export default async function SitePage({ params }: Props) {
  const data = await loadInitialData();
  const feature = data.sites.features.find((f) => f.properties.id === params.id);
  if (!feature) notFound();

  const gradesPair = data.grades[params.id];
  if (!gradesPair) notFound();

  return (
    <main className="flex-1">
      <Header />
      <div className="max-w-2xl mx-auto p-4">
        <Link href="/" className="text-sm text-slate-600 no-underline hover:underline">
          ← Back to map
        </Link>
        <DetailCard
          site={feature.properties}
          grade={gradesPair.paddle}
          activity="paddle"
          sources={data.sources}
          standalone
        />
        <Disclaimer />
      </div>
    </main>
  );
}
