/**
 * src/pages/Dashboard.tsx — SOC-style security operations dashboard
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { ORG_CONFIGS } from '@/types';
import { RiskGauge } from '@/components/risk/RiskGauge';
import { SignalBreakdown } from '@/components/risk/SignalBreakdown';
import { RiskBandBadge } from '@/components/risk/RiskBandBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  Radio,
  FileAudio,
  ChevronRight,
  Clock,
  ExternalLink,
} from 'lucide-react';

// Mock audit trail data for demo
const MOCK_AUDIT = [
  {
    id: 'ANA-001',
    timestamp: '2026-09-01 14:23:07',
    org: 'bank',
    band: 'low',
    score: 4.2,
    speaker: 'Speaker A',
  },
  {
    id: 'ANA-002',
    timestamp: '2026-09-01 14:20:15',
    org: 'enterprise',
    band: 'high',
    score: 72.8,
    speaker: null,
  },
  {
    id: 'ANA-003',
    timestamp: '2026-09-01 14:18:44',
    org: 'bank',
    band: 'critical',
    score: 91.3,
    speaker: null,
  },
  {
    id: 'ANA-004',
    timestamp: '2026-09-01 14:15:02',
    org: 'government',
    band: 'low',
    score: 2.1,
    speaker: 'Speaker B',
  },
  {
    id: 'ANA-005',
    timestamp: '2026-09-01 14:12:33',
    org: 'enterprise',
    band: 'medium',
    score: 14.6,
    speaker: null,
  },
];

const BAND_DOT: Record<string, string> = {
  low: 'bg-[rgb(var(--risk-low))]',
  medium: 'bg-[rgb(var(--risk-medium))]',
  high: 'bg-[rgb(var(--risk-high))]',
  critical: 'bg-[rgb(var(--risk-critical))]',
};

export function Dashboard() {
  const { org } = useOrganization();
  const { health } = useHealthCheck();
  const orgPolicy = ORG_CONFIGS[org];
  const online = health?.status === 'ok';
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Top row: Gauge + Signals + Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Gauge card */}
        <div className="card relative">
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <Tooltip label="Re-analyze" side="top">
              <button
                className="p-1.5 rounded text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[var(--hover-bg)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M21 21v-5h-5" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label="Save to report" side="top">
              <button
                className="p-1.5 rounded text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[var(--hover-bg)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip label="Flag for review" side="top">
              <button
                className="p-1.5 rounded text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[var(--hover-bg)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" x2="4" y1="22" y2="15" />
                </svg>
              </button>
            </Tooltip>
          </div>

          <div className="flex flex-col items-center pt-2">
            <RiskGauge score={null} band={null} size={180} />
            <p className="text-xs text-[rgb(var(--text-muted))] mt-2 font-mono">
              Upload audio or start live monitoring
            </p>
          </div>
        </div>

        {/* Signal Breakdown card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Signal Breakdown</h3>
              <p className="text-[11px] text-[rgb(var(--text-muted))] mt-0.5">Four-detector fusion metrics</p>
            </div>
          </div>
          <SignalBreakdown
            signals={{
              model: null,
              prosody_anomaly: null,
              voiceprint_risk: null,
              context_risk: null,
            }}
          />
        </div>

        {/* Right column: Action + Status */}
        <div className="space-y-4">
          {/* Recommended Action card */}
          <div className="card">
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">Recommended Action</h3>
            <div className="p-3 rounded-md bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))]">
              <p className="text-xs text-[rgb(var(--text-secondary))] leading-relaxed">
                {orgPolicy.actions.low}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-4 text-[11px] font-mono text-[rgb(var(--text-muted))]">
              <span>Threshold: {orgPolicy.thresholds.high_min}/100</span>
              <span>Critical: {orgPolicy.thresholds.critical_min}/100</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="card">
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5 border-b border-[rgb(var(--border-subtle))]">
                <span className="text-xs text-[rgb(var(--text-secondary))]">Backend</span>
                <span className={`text-xs font-mono ${online ? 'text-[rgb(var(--status-online))]' : 'text-[rgb(var(--status-offline))]'}`}>
                  {online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[rgb(var(--border-subtle))]">
                <span className="text-xs text-[rgb(var(--text-secondary))]">ML Engine</span>
                <span className="text-xs font-mono text-[rgb(var(--accent-soft))]">
                  {health?.ml_service || 'Wav2Vec2'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[rgb(var(--border-subtle))]">
                <span className="text-xs text-[rgb(var(--text-secondary))]">Database</span>
                <span className="text-xs font-mono text-[rgb(var(--text-secondary))]">
                  {health?.database || 'SQLite'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-[rgb(var(--text-secondary))]">Active Policy</span>
                <span className="text-xs font-mono text-[rgb(var(--text-primary))] capitalize">{org}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Waveform / Upload card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Audio Analysis</h3>
            <p className="text-[11px] text-[rgb(var(--text-muted))] mt-0.5">Drag-and-drop or record for real-time analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/analyze" className="btn btn-primary btn-sm">
              <FileAudio className="w-3.5 h-3.5" /> Upload File
            </Link>
            <Link to="/live-call" className="btn btn-ghost btn-sm">
              <Radio className="w-3.5 h-3.5" /> Live Monitor
            </Link>
          </div>
        </div>

        {/* Drop zone */}
        <Link
          to="/analyze"
          className="border-2 border-dashed border-[rgb(var(--border))] rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-[rgb(var(--accent))] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-[rgb(var(--accent))] text-white flex items-center justify-center mb-3 shadow-md">
            <FileAudio className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <p className="text-sm font-medium text-[rgb(var(--text-primary))]">
            Drop audio file here or click to browse
          </p>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-1 font-mono">
            WAV, MP3, FLAC, OGG — max 25MB
          </p>
        </Link>
      </div>

      {/* Audit trail */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Recent Analyses</h3>
            <p className="text-[11px] text-[rgb(var(--text-muted))] mt-0.5">Audit trail of past voice analyses</p>
          </div>
          <Link
            to="/audit"
            className="text-[11px] text-[rgb(var(--accent))] hover:text-[rgb(var(--accent-hover))] flex items-center gap-1 transition-colors"
          >
            View all <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-1">
          {MOCK_AUDIT.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 py-2.5 px-3 rounded-md hover:bg-[var(--hover-bg)] transition-colors cursor-pointer group"
              onClick={() =>
                setExpandedAudit(expandedAudit === entry.id ? null : entry.id)
              }
            >
              {/* Timestamp */}
              <div className="flex items-center gap-1.5 w-36 shrink-0">
                <Clock className="w-3 h-3 text-[rgb(var(--text-muted))]" />
                <span className="text-[11px] font-mono text-[rgb(var(--text-muted))]">
                  {entry.timestamp}
                </span>
              </div>

              {/* ID */}
              <span className="text-[11px] font-mono text-[rgb(var(--text-secondary))] w-16 shrink-0">
                {entry.id}
              </span>

              {/* Band dot + badge */}
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span className={`w-2 h-2 rounded-full ${BAND_DOT[entry.band]}`} />
                <RiskBandBadge band={entry.band} size="sm" />
              </div>

              {/* Score */}
              <span className="text-sm font-mono font-semibold text-[rgb(var(--text-primary))] w-14 text-right shrink-0">
                {entry.score}
              </span>

              {/* Speaker */}
              <span className="text-[11px] text-[rgb(var(--text-muted))] flex-1 truncate">
                {entry.speaker || '—'}
              </span>

              {/* Org */}
              <span className="text-[10px] font-mono text-[rgb(var(--text-muted))] uppercase w-16 text-right shrink-0">
                {entry.org}
              </span>

              {/* Expand chevron */}
              <ChevronRight
                className={`w-3.5 h-3.5 text-[rgb(var(--text-muted))] transition-transform duration-150 ${
                  expandedAudit === entry.id ? 'rotate-90' : ''
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
