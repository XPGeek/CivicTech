import { Text } from '@once-ui-system/core/components';
import type { ComponentProps, ReactNode } from 'react';

type TextProps = ComponentProps<typeof Text>;

/**
 * All-caps tracked label. Three tones cover the callsites in this app:
 *   - "section" — small gray label above a content block (DetailCard sections)
 *   - "brand"   — cyan eyebrow above a hero/heading (PageHero, "Pick a launch")
 *   - "danger"  — red eyebrow for error states
 *
 * The visual recipe (uppercase + letter-spacing) is owned by the `.eyebrow`
 * class in globals.css so it stays consistent if the typography changes.
 */
type Tone = 'section' | 'brand' | 'danger';

interface Props {
  tone?: Tone;
  children: ReactNode;
}

const TONE_PROPS: Record<
  Tone,
  Pick<TextProps, 'variant' | 'onBackground'>
> = {
  section: { variant: 'label-default-xs', onBackground: 'neutral-weak' },
  brand: { variant: 'label-default-s', onBackground: 'brand-medium' },
  danger: { variant: 'label-default-s', onBackground: 'danger-medium' },
};

export default function Eyebrow({ tone = 'section', children }: Props) {
  return (
    <Text {...TONE_PROPS[tone]} className="eyebrow">
      {children}
    </Text>
  );
}
