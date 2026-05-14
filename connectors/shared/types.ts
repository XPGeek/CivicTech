/**
 * Shared types for all connectors.
 *
 * See:
 *   - ADR-0003: Connector interface and normalized record schema
 *   - data/schema/normalized-record.schema.json
 *   - connectors/README.md
 */

/**
 * Closed enum of supported parameters. Adding a value here requires
 * updating the grading function and the UI display formatter.
 */
export type Parameter =
  | 'e_coli'
  | 'enterococcus'
  | 'turbidity'
  | 'dissolved_oxygen'
  | 'water_temp'
  | 'gauge_height'
  | 'streamflow'
  | 'precipitation_48h'
  | 'chlorophyll'
  | 'pH'
  | 'impairment_status';

/**
 * Canonical units per parameter. Connectors must convert to these
 * before emitting; see shared/units.ts for helpers.
 */
export const CANONICAL_UNITS: Record<Parameter, string> = {
  e_coli: 'MPN/100mL',
  enterococcus: 'MPN/100mL',
  turbidity: 'NTU',
  dissolved_oxygen: 'mg/L',
  water_temp: '°C',
  gauge_height: 'feet',
  streamflow: 'cubic feet per second',
  precipitation_48h: 'inches',
  chlorophyll: 'µg/L',
  pH: 'unitless',
  impairment_status: 'unitless',
};

/**
 * Source-reported quality-control flag.
 */
export type QCFlag = 'estimated' | 'provisional' | 'final';

/**
 * The universal currency of the system. Every connector emits arrays
 * of these. The grading function consumes them. The build step writes
 * them to R2 as JSON.
 *
 * IMPORTANT: `observed_at` is the source-reported timestamp, NEVER
 * ingestion time. Freshness logic in the grading function depends on
 * this distinction.
 */
export interface NormalizedRecord {
  /** Stable identifier; matches connector directory name. */
  source_id: string;
  /** Source's native station identifier. */
  station_id: string;
  /** Our internal site IDs informed by this station. Resolved during join. */
  site_ids: string[];
  /** ISO 8601 UTC timestamp from the source. */
  observed_at: string;
  /** Closed enum of supported parameters. */
  parameter: Parameter;
  /** Numeric value in canonical units. */
  value: number;
  /** Canonical units string; must match CANONICAL_UNITS[parameter]. */
  units: string;
  /** Source-reported QC flag, if any. */
  qc_flag?: QCFlag;
  /** Direct link to the source page for citation. Optional but encouraged. */
  raw_url?: string;
}

/**
 * Metadata describing a connector. Exported by each connector module
 * so the build orchestrator can introspect cadence, licensing, etc.
 */
export interface ConnectorMeta {
  /** Kebab-case identifier; matches the directory name. */
  id: string;
  /** Human-readable source name. */
  name: string;
  /** Expected refresh cadence. */
  cadence: 'hourly' | '6-hourly' | 'daily' | 'weekly';
  /** Data license; informs attribution and reuse policy. */
  license:
    | 'public-domain'
    | 'cc-by'
    | 'cc-by-sa'
    | 'cc0'
    | 'permission-granted'
    | 'unknown';
  /** Public contact URL or email for the data producer. */
  contact: string;
  /** Optional: maximum age in hours before the build degrades this source's
   *  contribution to "stale" status. Defaults vary by cadence. */
  freshness_threshold_hours?: number;
}

/**
 * Runtime context passed into every connector's fetch() function.
 */
export interface ConnectorContext {
  /** Sites that need data, with their declared station mappings. */
  sites: SiteForConnector[];
  /** Environment variables (sourced from .env in dev, GitHub Secrets in CI). */
  env: Record<string, string | undefined>;
  /** Build-time logger; never use console directly. */
  log: Logger;
  /** Current time as an ISO string. Injectable for deterministic testing. */
  now: () => string;
}

/**
 * A site, projected to just the fields a connector needs: the station IDs
 * that the site declares for this connector's source.
 */
export interface SiteForConnector {
  id: string;
  stations: { source_id: string; station_id: string }[];
}

/**
 * Structured logger interface. Implementation in shared/log.ts.
 */
export interface Logger {
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
}

/**
 * Structured error for connector failures. Lets the build step
 * decide whether to retry, skip, or fail.
 */
export class ConnectorError extends Error {
  code: string;
  recoverable: boolean;
  source_id: string;
  cause?: unknown;

  constructor(params: {
    code: string;
    message: string;
    recoverable: boolean;
    source_id: string;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'ConnectorError';
    this.code = params.code;
    this.recoverable = params.recoverable;
    this.source_id = params.source_id;
    this.cause = params.cause;
  }
}

/**
 * The shape of a grading result. Produced by grading/v1.ts, not by
 * connectors directly. Included here so the connector tests can
 * import the type without depending on the grading module.
 */
export type Grade = 'green' | 'yellow' | 'red' | 'unknown';

export type SignalStatus = 'pass' | 'caution' | 'fail' | 'stale' | 'missing';

export interface SignalState {
  status: SignalStatus;
  observed_at?: string;
  value?: number;
  units?: string;
  freshness_age_hours?: number;
}

export interface GradeOutput {
  site_id: string;
  grade: Grade;
  computed_at: string;
  reason: string;
  signals: {
    bacteria?: SignalState;
    rainfall?: SignalState;
    sonde?: SignalState;
    chronic?: SignalState;
  };
  /** The activity threshold used; affects bacterial pass/fail bands. */
  activity: 'paddle' | 'swim';
}
