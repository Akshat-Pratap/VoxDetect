/**
 * src/pages/Alerts.tsx
 * Alerts and evidence records history viewer.
 */
import React, { useEffect, useState } from 'react';
import { getAlerts } from '@/services/api';
import { useOrganization } from '@/context/OrganizationContext';
import { RiskBandBadge } from '@/components/risk/RiskBandBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AlertRecord } from '@/types';
import { Bell, Filter, ShieldAlert, RefreshCw } from 'lucide-react';

export function Alerts() {
  const { org } = useOrganization();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('');

  const fetchAlerts = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [org, severityFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Alerts & Evidence Center</h1>
          <p className="text-xs text-text-secondary mt-1">
            Historical log of flagged calls, risk scores, and recommended actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-bg-surface px-3 py-1.5 rounded-lg border border-bg-border text-xs">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-text-primary focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button onClick={fetchAlerts} className="btn btn-ghost btn-sm flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading alert history..." />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-6 h-6 text-text-muted" />}
          title="No alerts logged"
          message="No suspicious or flagged voice activity recorded under this profile yet."
        />
      ) : (
        <div className="card overflow-hidden p-0 border border-bg-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-bg-surface border-b border-bg-border text-text-muted uppercase text-[10px] font-semibold">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Analysis ID</th>
                  <th className="p-4">Risk Score</th>
                  <th className="p-4">Band</th>
                  <th className="p-4">Triggered Action</th>
                  <th className="p-4">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {alerts.map((item) => (
                  <tr key={item.analysis_id} className="hover:bg-bg-surface/50 transition-colors">
                    <td className="p-4 font-mono text-text-muted">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-text-primary">{item.analysis_id.slice(0, 8)}...</td>
                    <td className="p-4 font-mono font-bold text-text-primary">
                      {item.risk_score !== null ? `${Math.round(item.risk_score)}/100` : '—'}
                    </td>
                    <td className="p-4">
                      <RiskBandBadge band={item.risk_band} severity={item.severity} size="sm" />
                    </td>
                    <td className="p-4 text-text-primary font-medium">{item.recommended_action || '—'}</td>
                    <td className="p-4 font-mono text-text-muted">
                      {item.processing_latency_ms ? `${Math.round(item.processing_latency_ms)}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
