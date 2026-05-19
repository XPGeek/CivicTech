import { Column, Row, Tag, Text } from '@once-ui-system/core/components';
import { GRADE_LABELS, GRADE_SWIM_LABELS } from '@lib/grade-style';
import type { Activity, Grade } from '@lib/types';
import GradePin from './GradePin';

interface Props {
  grade: Grade;
  activity: Activity;
  reason: string;
  /** True when the verdict was computed from bacteria past the freshness window. */
  stale?: boolean;
}

export default function GradeHero({ grade, activity, reason, stale = false }: Props) {
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
      <GradePin grade={grade} stale={stale} size={44} />
      <Column gap="4" fillWidth>
        <Row gap="8" vertical="center" wrap>
          <Text variant="heading-strong-m" onBackground="neutral-strong">
            {label}
          </Text>
          {stale && (
            <Tag size="s" variant="neutral">
              Last known
            </Tag>
          )}
        </Row>
        <Text variant="body-default-s" onBackground="neutral-medium">
          {reason}
        </Text>
      </Column>
    </Row>
  );
}
