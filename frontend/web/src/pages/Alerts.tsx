/**
 * src/pages/Alerts.tsx — Alert history viewer
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getAlerts } from '@/services/api';
import { useOrganization } from '@/context/OrganizationContext';
import { RiskBandBadge } from '@/components/risk/RiskBandBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';
import { Tooltip } from '@/components/ui/Tooltip';
import type { AlertRecord } from '@/types';
import { Bell, RefreshCw, Search } from 'lucide-react';

const severityOptions: SelectOption[] = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function Alerts() {
  const { org } = useOrganization();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const fetchAlerts = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await getAlerts({
        organization: org,
        severity: severityFilter || undefined,
        limit: 50,
      });
      setAlerts(res.items || []);
    } catch {
      setAlerts([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [org, severityFilter]);

  useEffect(() => {
    fetchAlerts(true);
  }, [fetchAlerts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAlerts(false);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((a) =>
      a.analysis_id.toLowerCase().includes(q) ||
      new Date(a.created_at).toLocaleString().toLowerCase().includes(q)
    );
  }, [alerts, search]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Alerts & Evidence</h1>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
            Flagged calls, risk scores, and recommended actions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--text-muted))]" />
            <input
              type="text"
              placeholder="Search ID or time..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input !pl-8 !py-1.5 !text-xs !rounded"
              aria-label="Search alerts"
            />
          </div>

          <Select
            value={severityFilter}
            onChange={(v) => setSeverityFilter(v)}
            options={severityOptions}
            ariaLabel="Filter by severity"
            pill
          />
          <Tooltip label="Refresh alerts table" side="top">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-ghost btn-sm select-none"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin text-[rgb(var(--accent))]' : ''
                }`}
              />
              <span>Refresh</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading..." />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-5 h-5 text-[rgb(var(--text-muted))]" />}
          title="No alerts"
          message="No flagged activity under this profile yet."
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--hover-bg)] border-b border-[rgb(var(--border-subtle))]">
              <tr>
                <th className="p-3 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">Timestamp</th>
                <th className="p-3 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">ID</th>
                <th className="p-3 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">Score</th>
                <th className="p-3 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">Band</th>
                <th className="p-3 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">Action</th>
                <th className="p-3 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border-subtle))]">
              {filteredAlerts.map((item) => (
                <tr key={item.analysis_id} className="hover:bg-[var(--hover-bg)] transition-colors">
                  <td className="p-3 font-mono text-[rgb(var(--text-muted))]">
                    {new Date(item.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-[rgb(var(--text-primary))]">
                    {item.analysis_id.slice(0, 12)}
                  </td>
                  <td className="p-3 font-mono font-semibold text-[rgb(var(--text-primary))]">
                    {item.risk_score !== null ? `${Math.round(item.risk_score)}` : 'N/A'}
                  </td>
                  <td className="p-3">
                    <RiskBandBadge band={item.risk_band} severity={item.severity} size="sm" />
                  </td>
                  <td className="p-3 text-[rgb(var(--text-secondary))]">
                    {item.recommended_action || 'N/A'}
                  </td>
                  <td className="p-3 font-mono text-[rgb(var(--text-muted))]">
                    {item.processing_latency_ms ? `${Math.round(item.processing_latency_ms)}ms` : 'N/A'}
                  </td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-xs text-[rgb(var(--text-muted))]">
                    No alerts match &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}