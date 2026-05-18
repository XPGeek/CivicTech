import { Accordion, Column, Text } from '@once-ui-system/core';

/**
 * Full disclaimer (UX.md § 11). Collapsed by default but discoverable.
 * Surfaced on About + every detail card + first-visit interstitial.
 */
export default function Disclaimer() {
  return (
    <Accordion
      title={
        <Text variant="label-default-s" onBackground="neutral-strong">
          Important: informational, not a safety guarantee
        </Text>
      }
      size="m"
      radius="m"
    >
      <Column gap="12" paddingY="12">
        <Text variant="body-default-s" onBackground="neutral-strong">
          <strong>DMV Water Watch is an informational tool, not a safety guarantee.</strong>
        </Text>
        <Text variant="body-default-s" onBackground="neutral-medium">
          We aggregate public water-quality data from USGS, EPA, NOAA, DC DOEE, Anacostia
          Riverkeeper, and others. The data updates on the schedules those sources publish, which
          means our information is <strong>always at least somewhat retrospective</strong>. Water
          conditions can change rapidly due to rainfall, sewer overflows, spills, algal blooms,
          and other events that may not be reflected in our current grade.
        </Text>
        <Text variant="body-default-s" onBackground="neutral-medium">
          A &ldquo;paddle-safe&rdquo; or &ldquo;swim-safe&rdquo; grade does not mean conditions
          are guaranteed to be safe. Always:
        </Text>
        <Column as="ul" gap="4" paddingX="16">
          <Text as="li" variant="body-default-s" onBackground="neutral-medium">
            Observe posted signage and follow local authorities.
          </Text>
          <Text as="li" variant="body-default-s" onBackground="neutral-medium">
            Avoid water contact for at least 48 hours after significant rainfall (≥ 0.5 inch),
            regardless of our grade.
          </Text>
          <Text as="li" variant="body-default-s" onBackground="neutral-medium">
            Use your own judgment based on what you can see, smell, and observe.
          </Text>
        </Column>
        <Text variant="body-default-s" onBackground="neutral-medium">
          Swimming is <strong>prohibited in District of Columbia waters</strong> except during
          specifically permitted events. The swim toggle is educational; it is not an endorsement
          of swimming in DC waters.
        </Text>
        <Text variant="body-default-s" onBackground="neutral-medium">
          This service is provided &ldquo;as is,&rdquo; without warranty of any kind. By using
          DMV Water Watch you acknowledge that you assume all risks of water-based recreation and
          that we are not liable for any harm arising from use of this information.
        </Text>
      </Column>
    </Accordion>
  );
}
