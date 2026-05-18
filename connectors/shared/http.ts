import { ConnectorError } from './types';

export interface HttpOptions {
  source_id: string;
  /** Number of retries on transient failure. Default 3. */
  retries?: number;
  /** Initial backoff in ms; doubled per retry. Default 500ms. */
  backoffMs?: number;
  /** Per-attempt timeout in ms. Default 20000ms. */
  timeoutMs?: number;
  /** Extra headers. User-Agent should be set by caller via env. */
  headers?: Record<string, string>;
}

const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function httpJson<T = unknown>(
  url: string,
  opts: HttpOptions,
): Promise<T> {
  const retries = opts.retries ?? 3;
  const backoffMs = opts.backoffMs ?? 500;
  const timeoutMs = opts.timeoutMs ?? 20000;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          ...(opts.headers ?? {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return (await res.json()) as T;
      }

      const body = await res.text().catch(() => '');
      if (TRANSIENT_STATUS.has(res.status) && attempt < retries) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      throw new ConnectorError({
        code: `HTTP_${res.status}`,
        message: `GET ${url} → ${res.status}: ${body.slice(0, 200)}`,
        recoverable: TRANSIENT_STATUS.has(res.status),
        source_id: opts.source_id,
      });
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (err instanceof ConnectorError) {
        if (err.recoverable && attempt < retries) {
          await sleep(backoffMs * 2 ** attempt);
          continue;
        }
        throw err;
      }
      // Network / abort error
      if (attempt < retries) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      throw new ConnectorError({
        code: 'NETWORK',
        message: `GET ${url} failed: ${(err as Error).message}`,
        recoverable: true,
        source_id: opts.source_id,
        cause: err,
      });
    }
  }

  throw new ConnectorError({
    code: 'EXHAUSTED',
    message: `GET ${url} exhausted ${retries + 1} attempts`,
    recoverable: false,
    source_id: opts.source_id,
    cause: lastError,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
