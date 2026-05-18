/** Registry of all connectors. Adding a new one is a single import here. */

import * as usgs from '../connectors/usgs-nwis';
import * as noaa from '../connectors/noaa-precip';
import * as ark from '../connectors/anacostia-riverkeeper';
import * as doee from '../connectors/doee-sondes';
import * as epa from '../connectors/epa-hmw';
import type { ConnectorMeta, ConnectorContext, NormalizedRecord } from '../connectors/shared/types';

export interface Connector {
  meta: ConnectorMeta;
  fetch: (ctx: ConnectorContext) => Promise<NormalizedRecord[]>;
}

export const ALL_CONNECTORS: Connector[] = [usgs, noaa, ark, doee, epa];

export function findConnector(id: string): Connector | undefined {
  return ALL_CONNECTORS.find((c) => c.meta.id === id);
}
