import { Button, Column, Heading, Text } from '@once-ui-system/core/components';
import Header from '../../components/Header';

export default function NotFound() {
  return (
    <Column as="main" fillWidth horizontal="center">
      <Header />
      <Column
        maxWidth={28}
        paddingX="24"
        paddingY="64"
        gap="16"
        horizontal="center"
        align="center"
      >
        <Text variant="label-default-s" onBackground="neutral-weak">
          404
        </Text>
        <Heading variant="display-strong-m" align="center">
          That launch isn&rsquo;t on our map.
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-medium" align="center">
          It may have been removed, or the link is a typo. Head back to the map to find the
          launches we cover.
        </Text>
        <Button variant="primary" href="/" arrowIcon>
          Back to map
        </Button>
      </Column>
    </Column>
  );
}
