import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadInitialData, listSiteIds } from '@lib/data-source';
import { GRADE_LABELS } from '@lib/grade-style';
import DetailCard from '../../components/DetailCard';
import Disclaimer from '../../components/Disclaimer';
import Header from '../../components/Header';
import { Column, Heading, SmartLink } from '@once-ui-system/core';

export const dynamic = 'force-static';
export const dynamicParams = false;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return listSiteIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await loadInitialData();
  const feature = data.sites.features.find((f) => f.properties.id === id);
  if (!feature) return { title: 'Site not found — DMV Water Watch' };

  const grade = feature.properties.grade_paddle;
  const label = GRADE_LABELS[grade];
  const title = `${feature.properties.name} — ${label} | DMV Water Watch`;
  const description =
    data.grades[id]?.paddle.reason ??
    `Water-quality grade for ${feature.properties.name} on the ${feature.properties.river}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', url: `/site/${id}` },
    twitter: { card: 'summary', title, description },
  };
}

export default async function SitePage({ params }: Props) {
  const { id } = await params;
  const data = await loadInitialData();
  const feature = data.sites.features.find((f) => f.properties.id === id);
  if (!feature) notFound();
  const gradesPair = data.grades[id];
  if (!gradesPair) notFound();

  return (
    <Column as="main" fillWidth horizontal="center" gap="0">
      <Header />
      <Column maxWidth={36} paddingX="24" paddingY="32" gap="24" fillWidth>
        <SmartLink href="/" style={{ alignSelf: 'flex-start' }}>
          ← Back to map
        </SmartLink>
        <DetailCard
          site={feature.properties}
          grade={gradesPair.paddle}
          activity="paddle"
          sources={data.sources}
          standalone
        />
        <Disclaimer />
      </Column>
    </Column>
  );
}
