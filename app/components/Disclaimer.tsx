/**
 * Full disclaimer (UX.md § 11). Wrapped in <details> so it's collapsed by
 * default but discoverable. Surfaced on About + every detail card + first-visit
 * interstitial.
 */
export default function Disclaimer() {
  return (
    <details className="mt-4 text-sm text-slate-700 bg-slate-50 rounded p-3">
      <summary className="font-medium cursor-pointer">
        Important: this is an informational tool, not a safety guarantee
      </summary>
      <div className="mt-2 space-y-3 leading-relaxed">
        <p>
          <strong>DMV Water Watch is an informational tool, not a safety guarantee.</strong>
        </p>
        <p>
          We aggregate publicly available water-quality data from the U.S. Geological Survey, the
          U.S. Environmental Protection Agency, the National Oceanic and Atmospheric
          Administration, the District of Columbia Department of Energy and Environment, the
          Anacostia Riverkeeper, and other sources. The data is updated on the schedules those
          sources publish, which means our information is{' '}
          <strong>always at least somewhat retrospective</strong>. Water conditions can change
          rapidly due to rainfall, sewer overflows, spills, algal blooms, and other events that
          may not be reflected in our current grade.
        </p>
        <p>A "paddle-safe" or "swim-safe" grade does not mean conditions are guaranteed to be safe. Always:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Observe posted signage and follow guidance from local authorities.</li>
          <li>
            Avoid water contact for at least 48 hours after significant rainfall (≥ 0.5 inch),
            regardless of our grade.
          </li>
          <li>Use your own judgment based on what you can see, smell, and observe.</li>
        </ul>
        <p>
          Swimming is <strong>prohibited in District of Columbia waters</strong> except during
          specifically permitted events. Our swim toggle shows hypothetical thresholds for
          educational purposes; it is not an endorsement of swimming in DC waters.
        </p>
        <p>
          This service is provided "as is," without warranty of any kind. By using DMV Water
          Watch you acknowledge that you assume all risks of water-based recreation and that we
          are not liable for any harm arising from use of this information.
        </p>
      </div>
    </details>
  );
}
