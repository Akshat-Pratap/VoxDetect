/**
 * src/services/export.ts — Report export helpers.
 * Fetches alert history across all pagination pages (backend caps pages at 200)
 * so exports can span the full audit trail, not just the last page.
 */
import { getAlerts } from '@/services/api';
import type { AlertsFilter } from '@/services/api';
import type { AlertRecord, OrgType } from '@/types';

const PAGE_SIZE = 200; // matches the backend hard cap

export interface ExportSystemInfo {
  system_status: string;
  ml_service: string;
  version: string;
}

export interface ExportQuery {
  mode: 'last' | 'range' | 'ids' | 'until';
  organization: OrgType;
  count?: number | 'all';
  from_ts?: string;
  to_ts?: string;
  requested_ids?: string[];
  until_id?: string;
}

/**
 * Fetch every alert record for the given org, from newest to oldest,
 * walking the offset pagination until `total` is reached.
 */
export async function fetchAllAlerts(
  org: OrgType,
  filter?: Omit<AlertsFilter, 'organization' | 'limit' | 'offset'>
): Promise<AlertRecord[]> {
  const all: AlertRecord[] = [];
  let offset = 0;

  for (;;) {
    const res = await getAlerts({
      organization: org,
      limit: PAGE_SIZE,
      offset,
      ...filter,
    });
    all.push(...res.items);

    // Stop when we've got everything or the backend stops returning rows.
    if (all.length >= res.total) break;
    if (res.items.length === 0) break;
    offset += PAGE_SIZE;
  }

  return all;
}

/**
 * Apply the user's export query to a full (newest-first) alert list and return
 * the selected records plus any requested IDs that could not be found.
 */
export function selectAlertsForExport(
  all: AlertRecord[],
  query: ExportQuery
): { selected: AlertRecord[]; missing: string[] } {
  if (query.mode === 'last') {
    if (query.count && query.count !== 'all') {
      return { selected: all.slice(0, query.count), missing: [] };
    }
    return { selected: all, missing: [] };
  }

  if (query.mode === 'ids') {
    const requested = (query.requested_ids ?? []).map((s) => s.trim()).filter(Boolean);
    const wanted = new Set(requested);
    const selected = all.filter((a) => wanted.has(a.analysis_id));
    const missing = requested.filter((id) => !all.some((a) => a.analysis_id === id));
    return { selected, missing };
  }

  if (query.mode === 'until') {
    const target = (query.until_id ?? '').trim();
    if (!target) return { selected: [], missing: [] };
    const idx = all.findIndex((a) => a.analysis_id === target);
    if (idx === -1) return { selected: [], missing: [target] };
    return { selected: all.slice(0, idx + 1), missing: [] };
  }

  // range — server already filtered by from_ts/to_ts
  return { selected: all, missing: [] };
}