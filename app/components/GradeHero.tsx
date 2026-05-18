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
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 py-3 border-b border-slate-200"
    >
      <div className="flex-shrink-0" aria-hidden dangerouslySetInnerHTML={{ __html: GRADE_PIN_SVG[grade] }} />
      <div className="min-w-0">
        <div className="text-xl font-semibold text-slate-900">{label}</div>
        <div className="text-sm text-slate-600 leading-snug">{reason}</div>
      </div>
    </div>
  );
}
