import { Column, Heading, Text } from '@once-ui-system/core';

interface Props {
  eyebrow: string;
  title: string;
  lede: string;
  meta?: React.ReactNode;
}

export default function PageHero({ eyebrow, title, lede, meta }: Props) {
  return (
    <Column gap="12">
      <Text variant="label-default-s" onBackground="brand-medium">
        {eyebrow}
      </Text>
      <Heading variant="display-strong-l" as="h1">
        {title}
      </Heading>
      <Text variant="body-default-l" onBackground="neutral-medium">
        {lede}
      </Text>
      {meta}
    </Column>
  );
}
