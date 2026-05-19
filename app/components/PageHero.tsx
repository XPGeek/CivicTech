import { Column, Heading, Text } from '@once-ui-system/core/components';
import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  meta?: ReactNode;
}

/**
 * Marketing-style hero used at the top of every static page. Keeps the
 * eyebrow → title → lede rhythm consistent across /about, /methodology,
 * /sources, /site/[id].
 */
export default function PageHero({ eyebrow, title, lede, meta }: Props) {
  return (
    <Column gap="16" paddingBottom="16">
      <Text variant="label-default-s" onBackground="brand-medium" className="eyebrow">
        {eyebrow}
      </Text>
      <Heading variant="display-strong-l" wrap="balance">
        {title}
      </Heading>
      {lede && (
        <Text variant="heading-default-s" onBackground="neutral-medium" wrap="balance">
          {lede}
        </Text>
      )}
      {meta && <Column paddingTop="8">{meta}</Column>}
    </Column>
  );
}
