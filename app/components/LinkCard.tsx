import { Card, Column, Text } from '@once-ui-system/core/components';

interface Props {
  href: string;
  title: string;
  body: string;
}

/**
 * A compact card-as-link for cross-page navigation. Renders as an anchor
 * via once-ui's Card `href` prop so the entire card is clickable.
 */
export default function LinkCard({ href, title, body }: Props) {
  return (
    <Card
      href={href}
      padding="20"
      radius="m"
      gap="8"
      direction="column"
      style={{ flex: '1 1 200px', minWidth: 200 }}
    >
      <Column gap="4">
        <Text variant="label-default-m" onBackground="neutral-strong">
          {title}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-medium">
          {body}
        </Text>
      </Column>
    </Card>
  );
}
