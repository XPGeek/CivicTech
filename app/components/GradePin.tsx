import { pinSvgFor } from '@lib/grade-style';
import type { Grade } from '@lib/types';

interface Props {
  grade: Grade;
  /** Render the faded "last known" variant. Ignored for `unknown`. */
  stale?: boolean;
  /** Box size in pixels. Defaults to 36. */
  size?: number;
}

/**
 * Renders the grade pin SVG at a target box size. Shared between GradeHero
 * (44px on the detail card) and the methodology page legend (36px).
 *
 * Uses `dangerouslySetInnerHTML` because the SVGs live in `lib/grade-style.ts`
 * as raw strings (single source of truth for the map markers, which need
 * `el.innerHTML = ...`). If you port the SVGs to JSX components, drop the
 * raw-string path and update both this component and `Map.tsx`.
 */
export default function GradePin({ grade, stale = false, size = 36 }: Props) {
  return (
    <div
      aria-hidden
      style={{ width: size, height: size, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: pinSvgFor(grade, stale) }}
    />
  );
}
