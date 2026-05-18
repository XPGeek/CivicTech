/**
 * Grading rubric v1.
 *
 * Pure, deterministic, no I/O. Takes one site's normalized records and produces
 * one GradeOutput. The whole product hangs off this function — if it's wrong,
 * the app has no value.
 *
 * Specification: see GRADING.md and ADR-0004 in this repo.
 */

import type {
  Grade,
  GradeOutput,
  NormalizedRecord,
  Parameter,
  SignalState,
  SignalStatus,
} from '../connectors/shared/types';

export type Activity = 'paddle' | 'swim';

interface GradingInput {
  site_id: string;
  records: NormalizedRecord[];
  now: Date;
  activity: Activity;
}

// EPA 2012 RWQC thresholds (single-sample maximum). See GRADING.md § 2.
const BACTERIAL_THRESHOLDS: Record<Activity, { e_coli: number; enterococcus: number }> = {
  paddle: { e_coli: 575, enterococcus: 130 },
  swim: { e_coli: 235, enterococcus: 70 },
};

const HOURS = 3600_000;
const BACTERIA_MAX_AGE_HOURS = 7 * 24;
const SONDE_MAX_AGE_HOURS = 4;
const RAINFALL_MAX_AGE_HOURS = 6;

// Sonde sanity-check thresholds (GRADING.md § 3 Step 4).
const SONDE_THRESHOLDS = {
  turbidity_caution: 50, // NTU
  turbidity_fail: 100,
  do_caution: 5, // mg/L
  do_fail: 3,
  temp_caution: 32, // °C heat advisory
} as const;

// Rainfall override thresholds (GRADING.md § 3 Step 3).
const RAINFALL_THRESHOLDS = {
  caution: 0.5, // inches in last 48h
  fail: 1.0,
} as const;

const CHRONIC_TO_STATUS: Record<number, SignalStatus> = {
  0: 'pass',
  1: 'caution',
  2: 'fail',
};

export function gradeSite(input: GradingInput): GradeOutput {
  const { records, now, activity } = input;
  const bacteria = pickFreshest(records, ['e_coli', 'enterococcus']);
  const rainfall = pickFreshest(records, ['precipitation_48h']);
  const chronic = pickFreshest(records, ['impairment_status']);

  const bacteriaState = computeBacteriaState(bacteria, activity, now);
  const rainfallState = computeRainfallState(rainfall, bacteria, now);
  const sonde = collectSonde(records, now);

  const { verdict, dominant, outOfSeason } = combine(bacteriaState, rainfallState, sonde);
  const reason = composeReason(dominant, {
    bacteriaState,
    rainfallState,
    sonde,
    activity,
    outOfSeason,
  });

  const signals: GradeOutput['signals'] = {};
  if (bacteriaState.state) signals.bacteria = bacteriaState.state;
  if (rainfallState.state) signals.rainfall = rainfallState.state;
  if (sonde.state) signals.sonde = sonde.state;
  if (chronic) {
    signals.chronic = {
      status: CHRONIC_TO_STATUS[chronic.value] ?? 'caution',
      observed_at: chronic.observed_at,
      value: chronic.value,
      units: chronic.units,
      freshness_age_hours: ageHours(chronic.observed_at, now),
    };
  }

  return {
    site_id: input.site_id,
    grade: verdict,
    computed_at: now.toISOString(),
    reason,
    signals,
    activity,
  };
}

// ────────────────────────────────────────────────────────── helpers

interface BacteriaState {
  state: SignalState;
  status: SignalStatus;
  /** Latest reading within freshness window, if any. */
  reading?: NormalizedRecord;
  /** True when bacteria signal is missing or stale. */
  stale: boolean;
}

function computeBacteriaState(
  bacteria: NormalizedRecord | undefined,
  activity: Activity,
  now: Date,
): BacteriaState {
  if (!bacteria) {
    return {
      state: { status: 'missing' },
      status: 'missing',
      stale: true,
    };
  }

  const age = ageHours(bacteria.observed_at, now);
  if (age > BACTERIA_MAX_AGE_HOURS) {
    return {
      state: {
        status: 'stale',
        observed_at: bacteria.observed_at,
        value: bacteria.value,
        units: bacteria.units,
        freshness_age_hours: age,
      },
      status: 'stale',
      reading: bacteria,
      stale: true,
    };
  }

  // `pickFreshest` filtered to ['e_coli', 'enterococcus'], so the parameter is
  // guaranteed to be one of the bacterial keys.
  const param = bacteria.parameter as 'e_coli' | 'enterococcus';
  const threshold = BACTERIAL_THRESHOLDS[activity][param];
  const status: SignalStatus =
    bacteria.value <= threshold ? 'pass' : bacteria.value <= 2 * threshold ? 'caution' : 'fail';

  return {
    state: {
      status,
      observed_at: bacteria.observed_at,
      value: bacteria.value,
      units: bacteria.units,
      freshness_age_hours: age,
    },
    status,
    reading: bacteria,
    stale: false,
  };
}

interface RainfallState {
  state?: SignalState;
  status: SignalStatus;
  /** Should this rainfall reading drive an override? False if rain pre-dates the bacterial sample. */
  overrides: boolean;
}

function computeRainfallState(
  rainfall: NormalizedRecord | undefined,
  bacteria: NormalizedRecord | undefined,
  now: Date,
): RainfallState {
  if (!rainfall) {
    return { status: 'missing', overrides: false };
  }
  const age = ageHours(rainfall.observed_at, now);
  if (age > RAINFALL_MAX_AGE_HOURS) {
    return {
      state: {
        status: 'stale',
        observed_at: rainfall.observed_at,
        value: rainfall.value,
        units: rainfall.units,
        freshness_age_hours: age,
      },
      status: 'stale',
      overrides: false,
    };
  }

  let status: SignalStatus;
  if (rainfall.value >= RAINFALL_THRESHOLDS.fail) status = 'fail';
  else if (rainfall.value >= RAINFALL_THRESHOLDS.caution) status = 'caution';
  else status = 'pass';

  // GRADING.md § 4.1: override only if rainfall window ends AFTER bacterial sample.
  // We require a 1-hour buffer to disambiguate near-simultaneous timestamps.
  let overrides = true;
  if (bacteria) {
    const sampleTime = Date.parse(bacteria.observed_at);
    const rainTime = Date.parse(rainfall.observed_at);
    if (sampleTime + 1 * HOURS >= rainTime) overrides = false;
  }

  return {
    state: {
      status,
      observed_at: rainfall.observed_at,
      value: rainfall.value,
      units: rainfall.units,
      freshness_age_hours: age,
    },
    status,
    overrides,
  };
}

interface SondeState {
  state?: SignalState;
  /** Worst observed status across sonde signals (subject to the cap rules in combine). */
  worstStatus: SignalStatus;
  /** True if DO collapsed (< 3 mg/L) — this is the only sonde condition allowed to push pass→red. */
  doCollapse: boolean;
  /** Dominant driver among sonde signals, used to pick a reason template. */
  driver?: 'turbidity' | 'dissolved_oxygen' | 'water_temp';
}

function collectSonde(records: NormalizedRecord[], now: Date): SondeState {
  const turb = pickFreshestWithin(records, 'turbidity', SONDE_MAX_AGE_HOURS, now);
  const do_ = pickFreshestWithin(records, 'dissolved_oxygen', SONDE_MAX_AGE_HOURS, now);
  const temp = pickFreshestWithin(records, 'water_temp', SONDE_MAX_AGE_HOURS, now);

  if (!turb && !do_ && !temp) {
    return { worstStatus: 'missing', doCollapse: false };
  }

  let turbStatus: SignalStatus = 'pass';
  if (turb) {
    if (turb.value >= SONDE_THRESHOLDS.turbidity_fail) turbStatus = 'fail';
    else if (turb.value >= SONDE_THRESHOLDS.turbidity_caution) turbStatus = 'caution';
  } else {
    turbStatus = 'missing';
  }

  let doStatus: SignalStatus = 'pass';
  let doCollapse = false;
  if (do_) {
    if (do_.value < SONDE_THRESHOLDS.do_fail) {
      doStatus = 'fail';
      doCollapse = true;
    } else if (do_.value < SONDE_THRESHOLDS.do_caution) {
      doStatus = 'caution';
    }
  } else {
    doStatus = 'missing';
  }

  let tempStatus: SignalStatus = 'pass';
  if (temp && temp.value > SONDE_THRESHOLDS.temp_caution) tempStatus = 'caution';
  if (!temp) tempStatus = 'missing';

  const ranking: SignalStatus[] = ['fail', 'caution', 'pass', 'stale', 'missing'];
  const worst = ranking[
    Math.min(
      ranking.indexOf(turbStatus),
      ranking.indexOf(doStatus),
      ranking.indexOf(tempStatus),
    )
  ]!;

  let driver: SondeState['driver'];
  if (worst === 'fail' || worst === 'caution') {
    if (doStatus === worst) driver = 'dissolved_oxygen';
    else if (turbStatus === worst) driver = 'turbidity';
    else if (tempStatus === worst) driver = 'water_temp';
  }

  // Choose the record that drove the worst status for the SignalState.
  let driverRecord: NormalizedRecord | undefined;
  if (driver === 'dissolved_oxygen') driverRecord = do_;
  else if (driver === 'turbidity') driverRecord = turb;
  else if (driver === 'water_temp') driverRecord = temp;
  else driverRecord = turb ?? do_ ?? temp;

  return {
    state: driverRecord
      ? {
          status: worst,
          observed_at: driverRecord.observed_at,
          value: driverRecord.value,
          units: driverRecord.units,
          freshness_age_hours: ageHours(driverRecord.observed_at, now),
        }
      : undefined,
    worstStatus: worst,
    doCollapse,
    driver,
  };
}

type Dominant =
  | 'bacteria_pass'
  | 'bacteria_caution'
  | 'bacteria_fail'
  | 'rainfall_caution'
  | 'rainfall_fail'
  | 'sonde_turbidity'
  | 'sonde_do'
  | 'sonde_do_collapse'
  | 'sonde_temp'
  | 'out_of_season'
  | 'unknown';

function combine(
  bacteria: BacteriaState,
  rainfall: RainfallState,
  sonde: SondeState,
): { verdict: Grade; dominant: Dominant; outOfSeason: boolean } {
  // Out-of-season: bacteria stale/missing but sonde fresh AND healthy.
  const outOfSeason =
    bacteria.stale &&
    sonde.worstStatus !== 'missing' &&
    sonde.worstStatus !== 'fail';

  // No fresh signal anywhere → unknown.
  if (bacteria.stale && sonde.worstStatus === 'missing') {
    return { verdict: 'unknown', dominant: 'unknown', outOfSeason: false };
  }

  // Start from the worst of bacteria + rainfall (only counting rainfall when it
  // overrides — i.e., when rain fell after the bacterial sample).
  const bacteriaCmp = bacteria.stale ? 'pass' : (bacteria.status as 'pass' | 'caution' | 'fail');
  const rainfallCmp =
    rainfall.overrides && rainfall.status !== 'stale' && rainfall.status !== 'missing'
      ? (rainfall.status as 'pass' | 'caution' | 'fail')
      : 'pass';

  let core: 'pass' | 'caution' | 'fail' = worstOfPassCautionFail(bacteriaCmp, rainfallCmp);

  // Sonde modifier — GRADING.md § 4.2.
  //  - DO collapse (< 3) can push pass→fail.
  //  - Any sonde caution can push pass→caution.
  //  - Sonde fail (e.g. turbidity > 100) can only ever push pass→caution,
  //    never pass→fail (we don't override lab science with proxy).
  if (sonde.doCollapse) {
    core = worstOfPassCautionFail(core, 'fail');
  } else if (sonde.worstStatus === 'caution' || sonde.worstStatus === 'fail') {
    if (core === 'pass') core = 'caution';
    // If core is already caution or fail, leave it; sonde can't downgrade
    // further without DO collapse.
  }

  // Out-of-season override: bacteria stale + sonde fresh & healthy → yellow, not gray.
  if (outOfSeason && core === 'pass') {
    core = 'caution';
  }

  const verdict: Grade = core === 'pass' ? 'green' : core === 'caution' ? 'yellow' : 'red';

  // Pick the dominant driver for the reason string.
  let dominant: Dominant;
  if (outOfSeason && core === 'caution') {
    dominant = 'out_of_season';
  } else if (sonde.doCollapse && core === 'fail') {
    dominant = 'sonde_do_collapse';
  } else if (rainfall.overrides && rainfall.status === 'fail') {
    dominant = 'rainfall_fail';
  } else if (!bacteria.stale && bacteria.status === 'fail') {
    dominant = 'bacteria_fail';
  } else if (rainfall.overrides && rainfall.status === 'caution' && core === 'caution') {
    dominant = 'rainfall_caution';
  } else if (sonde.driver === 'dissolved_oxygen' && core === 'caution') {
    dominant = 'sonde_do';
  } else if (sonde.driver === 'turbidity' && core === 'caution') {
    dominant = 'sonde_turbidity';
  } else if (sonde.driver === 'water_temp' && core === 'caution') {
    dominant = 'sonde_temp';
  } else if (!bacteria.stale && bacteria.status === 'caution') {
    dominant = 'bacteria_caution';
  } else {
    dominant = 'bacteria_pass';
  }

  return { verdict, dominant, outOfSeason };
}

function composeReason(
  dominant: Dominant,
  ctx: {
    bacteriaState: BacteriaState;
    rainfallState: RainfallState;
    sonde: SondeState;
    activity: Activity;
    outOfSeason: boolean;
  },
): string {
  const activityLabel = ctx.activity === 'paddle' ? 'paddling' : 'swimming';
  switch (dominant) {
    case 'bacteria_pass':
      return ctx.sonde.worstStatus === 'pass'
        ? 'Bacteria low; no recent rain; real-time sensors look normal.'
        : 'Bacteria low; no recent rain affecting this site.';
    case 'bacteria_caution':
      return `Bacteria are elevated above the ${activityLabel} threshold but below the fail band.`;
    case 'bacteria_fail': {
      const ageDays = Math.max(
        0,
        Math.round((ctx.bacteriaState.state.freshness_age_hours ?? 0) / 24),
      );
      return `Bacteria exceed safe levels for ${activityLabel} (last sampled ${ageDays} day${ageDays === 1 ? '' : 's'} ago).`;
    }
    case 'rainfall_caution': {
      const inches = (ctx.rainfallState.state?.value ?? 0).toFixed(1);
      return `${inches} inches of rain in the last 48 hours — caution.`;
    }
    case 'rainfall_fail': {
      const inches = (ctx.rainfallState.state?.value ?? 0).toFixed(1);
      return `${inches} inches of rain in the last 48 hours; CSO advisory likely in effect.`;
    }
    case 'sonde_do':
      return 'Dissolved oxygen is low — possible algal bloom or warm-water stress.';
    case 'sonde_do_collapse':
      return 'Dissolved oxygen has collapsed — fish kill or severe algal bloom possible.';
    case 'sonde_turbidity':
      return 'Turbidity is elevated — water is murkier than usual.';
    case 'sonde_temp':
      return 'Water temperature is high — heat-stress conditions possible.';
    case 'out_of_season':
      return 'Bacterial sampling out of season; real-time signals look normal.';
    case 'unknown':
      return 'No fresh data available for this site right now.';
  }
}

// ────────────────────────────────────────────────────────── primitive helpers

function ageHours(observedAt: string, now: Date): number {
  return (now.getTime() - Date.parse(observedAt)) / HOURS;
}

function pickFreshest(
  records: NormalizedRecord[],
  parameters: Parameter[],
): NormalizedRecord | undefined {
  let best: NormalizedRecord | undefined;
  for (const r of records) {
    if (!parameters.includes(r.parameter)) continue;
    if (!best || Date.parse(r.observed_at) > Date.parse(best.observed_at)) best = r;
  }
  return best;
}

function pickFreshestWithin(
  records: NormalizedRecord[],
  parameter: Parameter,
  maxAgeHours: number,
  now: Date,
): NormalizedRecord | undefined {
  let best: NormalizedRecord | undefined;
  for (const r of records) {
    if (r.parameter !== parameter) continue;
    if (ageHours(r.observed_at, now) > maxAgeHours) continue;
    if (!best || Date.parse(r.observed_at) > Date.parse(best.observed_at)) best = r;
  }
  return best;
}

function worstOfPassCautionFail(
  a: 'pass' | 'caution' | 'fail',
  b: 'pass' | 'caution' | 'fail',
): 'pass' | 'caution' | 'fail' {
  if (a === 'fail' || b === 'fail') return 'fail';
  if (a === 'caution' || b === 'caution') return 'caution';
  return 'pass';
}
