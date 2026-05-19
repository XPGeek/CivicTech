import { Column, Row, Text } from '@once-ui-system/core/components';
import { GRADE_LABELS, GRADE_SWIM_LABELS } from '@lib/grade-style';
import type { Activity, Grade } from '@lib/types';
import GradePin from './GradePin';

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
      borderBottom="neutral-alpha-weak"
    >
      <GradePin grade={grade} size={44} />
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
