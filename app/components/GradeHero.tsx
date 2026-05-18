import { Column, Row, Text } from '@once-ui-system/core';
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
      role="status"
      aria-live="polite"
      gap="16"
      vertical="center"
      paddingY="16"
      style={{ borderBottom: '1px solid var(--neutral-alpha-weak, rgba(15,23,42,0.08))' }}
    >
      <div
        aria-hidden
        style={{ width: 44, height: 44, flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: GRADE_PIN_SVG[grade] }}
      />
      <Column gap="4" fillWidth>
        <Text variant="heading-strong-m" onBackground="neutral-strong">
          {label}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-medium">
          {reason}
        </Text>
      </Column>
    </Row>
  );
}
