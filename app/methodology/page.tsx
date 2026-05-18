import Header from '../components/Header';
import { GRADE_PIN_SVG } from '@lib/grade-style';

export const metadata = {
  title: 'Methodology — DMV Water Watch',
  description:
    'How we compute each site\'s grade: bacterial samples, 48-hour rainfall, DOEE sondes, EPA impairment status.',
};

export default function MethodologyPage() {
  return (
    <main className="flex-1">
      <Header />
      <article className="max-w-2xl mx-auto p-4 prose prose-slate prose-sm sm:prose-base">
        <h1>How grades are calculated</h1>
        <p>
          Every site receives one of four grades: <strong>green</strong>, <strong>yellow</strong>,{' '}
          <strong>red</strong>, or <strong>unknown</strong>. Each grade is computed by a
          deterministic rubric that takes four kinds of signals and combines them in a fixed
          order. There is no machine learning, no proprietary scoring; you can audit the algorithm
          in <code>grading/v1.ts</code> of our repository.
        </p>

        <h2>The four signals</h2>
        <ul>
          <li>
            <strong>Bacteria</strong> — single-sample E. coli or enterococcus from Anacostia
            Riverkeeper or DOEE labs, within the past 7 days. The primary signal.
          </li>
          <li>
            <strong>Rainfall</strong> — 48-hour precipitation total from the nearest NOAA station.
          </li>
          <li>
            <strong>Real-time sonde</strong> — DOEE YSI sondes report turbidity, dissolved
            oxygen, and water temperature every 15 minutes.
          </li>
          <li>
            <strong>Chronic impairment</strong> — EPA's How's My Waterway assessment shown as a
            badge but not used in the daily verdict.
          </li>
        </ul>

        <h2>Activity thresholds</h2>
        <p>
          We use EPA's 2012 Recreational Water Quality Criteria thresholds, applied per activity:
        </p>
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>E. coli pass (MPN/100mL)</th>
              <th>Enterococcus pass (MPN/100mL)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Paddle / row / SUP (secondary contact)</td>
              <td>≤ 575</td>
              <td>≤ 130</td>
            </tr>
            <tr>
              <td>Swim (primary contact)</td>
              <td>≤ 235</td>
              <td>≤ 70</td>
            </tr>
          </tbody>
        </table>
        <p>
          A reading up to <strong>2× the pass threshold</strong> shows as <em>caution</em>.
          Higher shows as <em>fail</em>.
        </p>

        <h2>Rainfall override</h2>
        <p>
          Heavy rain stirs up bacteria and triggers combined-sewer overflows (CSOs). We override
          the bacteria signal as follows, but only if the rainfall fell <em>after</em> the most
          recent bacterial sample:
        </p>
        <ul>
          <li>≥ 0.5 inches in 48 hours → at least caution</li>
          <li>≥ 1.0 inch in 48 hours → red regardless of bacteria</li>
        </ul>

        <h2>Sonde sanity check</h2>
        <p>
          DOEE's real-time sensors can downgrade a passing site to caution if something looks
          off — turbidity above 50 NTU, dissolved oxygen below 5 mg/L, or water temperature
          above 32 °C. They <em>cannot</em> push a passing site to red except when dissolved
          oxygen collapses below 3 mg/L (a real health and wildlife indicator).
        </p>

        <h2>What the grades mean</h2>
        <ul className="not-prose space-y-3 mt-3">
          <li className="flex gap-3 items-start">
            <span
              className="flex-shrink-0"
              aria-hidden
              dangerouslySetInnerHTML={{ __html: GRADE_PIN_SVG.green }}
            />
            <span>
              <strong>Green / Paddle-safe</strong> — bacteria are within the activity threshold,
              there's no recent rain, and (when sondes are present) real-time sensors look normal.
            </span>
          </li>
          <li className="flex gap-3 items-start">
            <span
              className="flex-shrink-0"
              aria-hidden
              dangerouslySetInnerHTML={{ __html: GRADE_PIN_SVG.yellow }}
            />
            <span>
              <strong>Yellow / Caution</strong> — one signal is elevated above the safety band but
              hasn't crossed the fail threshold. Read the reason sentence on the detail card.
            </span>
          </li>
          <li className="flex gap-3 items-start">
            <span
              className="flex-shrink-0"
              aria-hidden
              dangerouslySetInnerHTML={{ __html: GRADE_PIN_SVG.red }}
            />
            <span>
              <strong>Red / Avoid</strong> — bacteria exceed safe levels for this activity, or
              heavy rainfall makes recent values unreliable, or dissolved oxygen has collapsed.
            </span>
          </li>
          <li className="flex gap-3 items-start">
            <span
              className="flex-shrink-0"
              aria-hidden
              dangerouslySetInnerHTML={{ __html: GRADE_PIN_SVG.unknown }}
            />
            <span>
              <strong>Unknown</strong> — no fresh data is available for this site right now. Try
              again later or check directly with the site operator.
            </span>
          </li>
        </ul>

        <h2>What this rubric is not</h2>
        <ul>
          <li>
            Not a regulatory threshold. EPA and state regulators use 30-day geometric means for
            assessment. Our single-sample approach is appropriate for daily decisions, not for
            legal compliance reporting.
          </li>
          <li>
            Not a guarantee. Lab samples are point-in-time. We cannot detect a sewer overflow
            that happened 20 minutes ago.
          </li>
          <li>
            Not a substitute for posted advisories. If the site has a posted "No Swimming" sign,
            the sign wins.
          </li>
          <li>Not predictive. We do not forecast tomorrow's grade.</li>
        </ul>

        <h2>Versioning</h2>
        <p>
          The current rubric is <strong>v1</strong>. Any change to thresholds or logic requires a
          new ADR in our public repository.
        </p>
      </article>
    </main>
  );
}
