/**
 * src/components/layout/ExportReportModal.tsx
 * Lets the user choose exactly what gets exported:
 *  - Recent N alerts (50 / 200 / everything)
 *  - A date range
 *  - One or more specific analysis IDs (add as many as you like)
 *  - Everything newest-first up to a specific analysis ID
 *
 * Layout mirrors a shadcn-style dialog: bordered header on top, a two-column
 * body (mode picker on the left, fields on the right), right-aligned footer.
 */
import React, { useEffect, useState } from 'react';
import { X, Plus, Loader2, Clock3, CalendarRange, Tag, FileSearch } from 'lucide-react';
import { DownloadDoneIcon } from '@/components/ui/AnimatedIcons';
import { useAlertContext } from '@/context/AlertContext';
import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { getAlerts } from '@/services/api';
import { fetchAllAlerts, selectAlertsForExport } from '@/services/export';
import type { ExportSystemInfo, ExportQuery } from '@/services/export';
import { ORG_CONFIGS } from '@/types';
import type { OrgType, AlertRecord } from '@/types';

type ExportMode = ExportQuery['mode'];

const countOptions: SelectOption[] = [
  { value: '50', label: 'Last 50', sublabel: 'Most recent records' },
  { value: '200', label: 'Last 200', sublabel: 'Recent two pages' },
  { value: 'all', label: 'Everything', sublabel: 'Full audit trail' },
];

const modes: { id: ExportMode; label: string; desc: string; icon: typeof Clock3 }[] = [
  { id: 'last', label: 'Recent N', desc: 'Last 50, 200, or the full trail', icon: Clock3 },
  { id: 'range', label: 'Date Range', desc: 'Between two timestamps', icon: CalendarRange },
  { id: 'ids', label: 'Specific IDs', desc: 'Pick one or more analyses', icon: Tag },
  { id: 'until', label: 'Up to an ID', desc: 'Everything until one analysis', icon: FileSearch },
];

interface ExportReportModalProps {
  open: boolean;
  org: OrgType;
  systemInfo: ExportSystemInfo;
  onClose: () => void;
}

export function ExportReportModal({ open, org, systemInfo, onClose }: ExportReportModalProps) {
  const { addToast } = useAlertContext();

  const [mode, setMode] = useState<ExportMode>('last');
  const [count, setCount] = useState('50');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [ids, setIds] = useState<string[]>([]);
  const [idInput, setIdInput] = useState('');
  const [untilId, setUntilId] = useState('');

  const [total, setTotal] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show how many alerts exist so users know the export scope.
  useEffect(() => {
    let cancelled = false;
    getAlerts({ organization: org, limit: 1 })
      .then((res) => {
        if (!cancelled) setTotal(res.total);
      })
      .catch(() => {
        if (!cancelled) setTotal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [org]);

  const addId = () => {
    const value = idInput.trim();
    if (!value || ids.includes(value)) return;
    setIds((prev) => [...prev, value]);
    setIdInput('');
  };

  const downloadReport = (report: unknown) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxdetect-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    try {
      const query: ExportQuery = { mode, organization: org };

      if (mode === 'range') {
        if (rangeFrom) query.from_ts = new Date(rangeFrom).toISOString();
        if (rangeTo) query.to_ts = new Date(rangeTo).toISOString();
      } else if (mode === 'ids') {
        const clean = ids.map((s) => s.trim()).filter(Boolean);
        if (clean.length === 0) {
          setError('Add at least one analysis ID first.');
          setExporting(false);
          return;
        }
        query.requested_ids = clean;
      } else if (mode === 'until') {
        query.until_id = untilId;
      } else {
        query.count = count === 'all' ? 'all' : Number(count);
      }

      const all = await fetchAllAlerts(org, {
        from_ts: query.from_ts,
        to_ts: query.to_ts,
      });

      const { selected, missing } = selectAlertsForExport(all, query);

      if (selected.length === 0) {
        setError(missing.length > 0 ? `No alerts found for ${missing.join(', ')}.` : 'No alerts match this selection.');
        setExporting(false);
        return;
      }

      const policy = ORG_CONFIGS[org];
      const report = {
        generated_at: new Date().toISOString(),
        export_query: query,
        organization: org,
        active_policy: {
          thresholds: policy.thresholds,
          actions: policy.actions,
        },
        system: systemInfo,
        alert_count: selected.length,
        requested_not_found: missing.length > 0 ? missing : undefined,
        alerts: selected.map((a: AlertRecord) => ({
          analysis_id: a.analysis_id,
          created_at: a.created_at,
          risk_score: a.risk_score,
          risk_band: a.risk_band,
          severity: a.severity,
          recommended_action: a.recommended_action,
          processing_latency_ms: a.processing_latency_ms,
        })),
      };

      downloadReport(report);
      addToast({
        type: 'success',
        title: 'Report exported',
        message: `${selected.length} alert${selected.length === 1 ? '' : 's'} exported to JSON.${
          missing.length > 0 ? ` ${missing.length} requested ID(s) not found.` : ''
        }`,
        autoClose: false,
      });
      onClose();
    } catch {
      setError('Export failed. Could not reach the VoxDetect API.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Report"
      description={
        total !== null
          ? `${total.toLocaleString()} alert${total === 1 ? '' : 's'} stored. Choose what to include.`
          : 'Fetching alert count…'
      }
      footer={
        <>
          <button onClick={onClose} className="btn btn-outline" disabled={exporting}>
            Cancel
          </button>
          <button onClick={handleExport} className="btn btn-primary" disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Exporting…
              </>
            ) : (
              <>
                <DownloadDoneIcon size={16} /> Export
              </>
            )}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left: mode picker */}
        <div className="space-y-2 md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2">
            Scope
          </p>
          {modes.map((m) => {
            const active = mode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all select-none ${
                  active
                    ? 'border-[rgb(var(--accent))] bg-[rgba(20,184,166,0.08)]'
                    : 'border-[rgb(var(--border-subtle))] bg-[var(--hover-bg)] hover:bg-[var(--hover-bg-strong)] hover:border-[rgb(var(--border))]'
                }`}
              >
                <span
                  className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center ${
                    active
                      ? 'bg-[rgb(var(--accent))] text-white'
                      : 'bg-[var(--hover-bg-strong)] text-[rgb(var(--text-muted))]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-[13px] font-medium ${
                      active ? 'text-[rgb(var(--accent-soft))]' : 'text-[rgb(var(--text-primary))]'
                    }`}
                  >
                    {m.label}
                  </span>
<span className="block text-[11px] text-[rgb(var(--text-muted))] mt-0.5 leading-snug truncate">
                      {m.desc}
                    </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: fields */}
        <div className="md:col-span-3 space-y-4">
          {mode === 'last' && (
            <div>
              <label className="text-[13px] font-medium text-[rgb(var(--text-primary))] block mb-1.5">
                How many recent alerts?
              </label>
              <p className="text-[11px] text-[rgb(var(--text-muted))] mb-2.5">
                Newest records first, from the current audit trail.
              </p>
              <Select value={count} onChange={setCount} options={countOptions} ariaLabel="Number of alerts to export" fullWidth />
            </div>
          )}

          {mode === 'range' && (
            <>
              <div>
                <label className="text-[13px] font-medium text-[rgb(var(--text-primary))] block mb-1.5">
                  From
                </label>
                <label className="text-[11px] text-[rgb(var(--text-muted))] block mb-2 whitespace-nowrap">
                  Alerts created at or after this time
                </label>
                <input type="datetime-local" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="text-[13px] font-medium text-[rgb(var(--text-primary))] block mb-1.5">
                  To
                </label>
                <label className="text-[11px] text-[rgb(var(--text-muted))] block mb-2 whitespace-nowrap">
                  Alerts created at or before this time
                </label>
                <input type="datetime-local" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="input w-full" />
              </div>
            </>
          )}

          {mode === 'ids' && (
            <>
              <div>
                <label className="text-[13px] font-medium text-[rgb(var(--text-primary))] block mb-1.5">
                  Analysis IDs
                </label>
                <label className="text-[11px] text-[rgb(var(--text-muted))] block mb-2.5">
                  Type an ID and press Enter or Add to include it.
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addId();
                      }
                    }}
                    placeholder="e.g. a1b2c3d4"
                    className="input w-full"
                    aria-label="Analysis ID to add"
                  />
                  <button type="button" onClick={addId} className="btn btn-outline shrink-0" aria-label="Add analysis ID">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              {ids.length > 0 && (
                <div>
                  <p className="text-[11px] text-[rgb(var(--text-muted))] mb-2">
                    {ids.length} ID{ids.length === 1 ? '' : 's'} queued
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ids.map((id, i) => (
                      <span
                        key={`${id}-${i}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--hover-bg-strong)] border border-[rgb(var(--border-subtle))] text-[11px] font-mono text-[rgb(var(--text-primary))]"
                      >
                        {id}
                        <button
                          type="button"
                          onClick={() => setIds((prev) => prev.filter((_, x) => x !== i))}
                          className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--risk-critical))] transition-colors"
                          aria-label={`Remove ${id}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'until' && (
            <div>
              <label className="text-[13px] font-medium text-[rgb(var(--text-primary))] block mb-1.5">
                Stop-at analysis ID
              </label>
              <label className="text-[11px] text-[rgb(var(--text-muted))] block mb-2.5">
                Exports the trail newest-first, down to and including this ID.
              </label>
              <input
                type="text"
                value={untilId}
                onChange={(e) => setUntilId(e.target.value)}
                placeholder="e.g. a1b2c3d4"
                className="input w-full"
                aria-label="Stop-at analysis ID"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-[12px] text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}