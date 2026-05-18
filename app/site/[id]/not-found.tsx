import { Column, Heading, Row, Text, Button } from '@once-ui-system/core';
import Header from '../../components/Header';

export default function NotFound() {
  return (
    <Column as="main" fillWidth horizontal="center">
      <Header />
      <Column
        maxWidth={28}
        paddingX="24"
        paddingY="48"
        gap="16"
        fillWidth
        horizontal="center"
        align="center"
      >
        <Heading variant="display-strong-m" as="h1">
          That site isn&rsquo;t on our map.
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-medium">
          It may have been removed, or the link could be a typo. Head back to browse the catalog.
        </Text>
        <Row paddingTop="8">
          <Button href="/" variant="primary">
            Back to map
          </Button>
        </Row>
      </Column>
    </Column>
  );
}
