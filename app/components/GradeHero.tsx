import { Row, Column, Heading, Text } from '@once-ui-system/core';
import { GRADE_LABELS, GRADE_SWIM_LABELS, GRADE_PIN_SVG } from '@lib/grade-style';
import type { Activity, Grade } from '@lib/types';

interface Props {
  grade: Grade;
  activity: Activity;
  reason: string;
}

export default function GradeHero({ grade, activity, reason }: Props) {
  const label = (activity === 'swim' ? GRADE_SWIM_LABELS : GRADE_LABELS)[grade];
  return (
    <Row
      paddingY="16"
      gap="16"
      vertical="center"
      role="status"
      aria-live="polite"
      borderBottom="neutral-medium"
    >
      <div
        aria-hidden
        style={{ width: 44, height: 44, flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: GRADE_PIN_SVG[grade] }}
      />
      <Column gap="4" fillWidth>
        <Heading variant="display-strong-xs" as="h2">
          {label}
        </Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {reason}
        </Text>
      </Column>
    </Row>
  );
}
