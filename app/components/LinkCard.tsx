import { Card, Column, SmartLink, Text } from '@once-ui-system/core';

interface Props {
  href: string;
  title: string;
  body: string;
}

export default function LinkCard({ href, title, body }: Props) {
  return (
    <SmartLink href={href} unstyled style={{ flex: '1 1 220px', minWidth: 220 }}>
      <Card padding="16" radius="m" cursor="interactive" transition="micro-medium">
        <Column gap="8">
          <Text variant="label-default-m" onBackground="neutral-strong">
            {title} →
          </Text>
          <Text variant="body-default-s" onBackground="neutral-medium">
            {body}
          </Text>
        </Column>
      </Card>
    </SmartLink>
  );
}
