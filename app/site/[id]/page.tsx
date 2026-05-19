import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Column, Row, Text } from '@once-ui-system/core/components';
import { loadInitialData, listSiteIds } from '@lib/data-source';
import { GRADE_LABELS } from '@lib/grade-style';
import DetailCard from '../../components/DetailCard';
import Disclaimer from '../../components/Disclaimer';
import Header from '../../components/Header';

export const dynamic = 'force-static';
export const dynamicParams = false;

interface Params {
  id: string;
}
type PageProps = { params: Promise<Params> };

export async function generateStaticParams(): Promise<Params[]> {
  return listSiteIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await loadInitialData();
  const feature = data.sites.features.find((f) => f.properties.id === id);
  if (!feature) return { title: 'Site not found' };

  const grade = feature.properties.grade_paddle;
  const label = GRADE_LABELS[grade];
  const title = `${feature.properties.name} — ${label}`;
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

export default async function SitePage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadInitialData();
  const feature = data.sites.features.find((f) => f.properties.id === id);
  if (!feature) notFound();

  const gradesPair = data.grades[id];
  if (!gradesPair) notFound();

  return (
    <Column as="main" fillWidth horizontal="center">
      <Header />
      <Column maxWidth={36} paddingX="24" paddingY="32" gap="24" fillWidth>
        <Row gap="8" vertical="center">
          <Link href="/" className="back-link">
            <Text variant="body-default-s" onBackground="neutral-medium">
              ← Back to map
            </Text>
          </Link>
        </Row>
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
