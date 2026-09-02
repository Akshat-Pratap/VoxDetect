/**
 * src/pages/Dashboard.tsx — Clean command-center launcher.
 *
 * No dead widgets or mock data. Purpose-of-page is navigation: each card
 * represents one real tool and links to its page. System status is live from
 * the health API. The org switcher in the TopBar sets the active policy, so
 * it is simply reflected here (no duplicate, confusing control).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { useOrganization } from '@/context/OrganizationContext';
import { ORG_CONFIGS } from '@/types';
import { AudioWaveform, Radio, ShieldAlert, ScrollText, UserPlus, Settings, CheckCircle2, XCircle } from 'lucide-react';

interface ToolCard {
  to: string;
  title: string;
  description: string;
  cta: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: string;
}

const TOOLS: ToolCard[] = [
  {
    to: '/analyze',
    title: 'Analyze Audio',
    description: 'Upload a voice clip and get a real-vs-clone verdict with a full signal breakdown.',
    cta: 'Upload a file',
    icon: AudioWaveform,
    accent: 'rgb(var(--accent))',
  },
  {
    to: '/live-call',
    title: 'Live Monitor',
    description: 'Stream your microphone and score every chunk in real time. Best for live-call demos.',
    cta: 'Start monitoring',
    icon: Radio,
    accent: 'rgb(var(--risk-high))',
  },
  {
    to: '/alerts',
    title: 'Alerts',
    description: 'Review flagged high and critical risk detections raised against the active policy.',
    cta: 'Review alerts',
    icon: ShieldAlert,
    accent: 'rgb(var(--risk-critical))',
  },
  {
    to: '/audit',
    title: 'Audit Log',
    description: 'Browse the full history of past analyses with scores, bands and outcomes.',
    cta: 'View audit trail',
    icon: ScrollText,
    accent: 'rgb(var(--risk-medium))',
  },
  {
    to: '/voiceprints',
    title: 'Voiceprints',
    description: 'Enroll reference speakers so voiceprint fusion can flag cloned enrollment audio.',
    cta: 'Enroll a speaker',
    icon: UserPlus,
    accent: 'rgb(var(--accent-soft))',
  },
];

export function Dashboard() {
  const { health, error, lastChecked } = useHealthCheck();
  const { org } = useOrganization();
  const orgPolicy = ORG_CONFIGS[org];
  const online = health?.status === 'ok';

  const statusItems = [
    { label: 'Backend', value: online ? 'Online' : 'Offline', ok: online },
    { label: 'ML Engine', value: health?.ml_service || 'wav2vec2-XLSR', ok: online },
    { label: 'Database', value: health?.database || 'SQLite', ok: online },
    { label: 'Version', value: health?.version || 'N/A', ok: true },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Command Center</h1>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
            Pick a tool to get started. Active policy:{' '}
            <span className="font-mono text-[rgb(var(--text-secondary))] capitalize">{org}</span>
            {' '}{orgPolicy.actions.low}
          </p>
        </div>
        <Link to="/settings" className="btn btn-ghost btn-sm">
          <Settings className="w-3.5 h-3.5" /> Settings
        </Link>
      </div>

      {/* Tool cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.to}
              to={tool.to}
              className="group card !p-5 flex flex-col hover:border-[rgb(var(--accent))/0.5] hover:shadow-md transition-all"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-white shadow-md transition-all group-hover:scale-105"
                style={{ backgroundColor: tool.accent }}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] transition-colors">
                {tool.title}
              </h3>
              <p className="text-[11px] text-[rgb(var(--text-muted))] leading-relaxed mt-1 flex-1">
                {tool.description}
              </p>
              <span
                className="text-[11px] font-medium mt-3"
                style={{ color: tool.accent }}
              >
                {tool.cta} →
              </span>
            </Link>
          );
        })}

        {/* System status card */}
        <div className="card !p-5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))]">System Status</h3>
            {online ? (
              <span className="flex items-center gap-1 text-[11px] font-mono text-[rgb(var(--status-online))]">
                <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-mono text-[rgb(var(--status-offline))]">
                <XCircle className="w-3.5 h-3.5" /> OFFLINE
              </span>
            )}
          </div>
          <div className="flex-1 space-y-2 mt-1">
            {statusItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1 border-b border-[rgb(var(--border-subtle))] last:border-0"
              >
                <span className="text-[11px] text-[rgb(var(--text-secondary))]">{item.label}</span>
                <span
                  className={`text-[11px] font-mono ${
                    item.ok
                      ? 'text-[rgb(var(--text-primary))]'
                      : 'text-[rgb(var(--status-offline))]'
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[9px] font-mono text-[rgb(var(--text-muted))] mt-2">
            {error
              ? 'Backend unreachable. Start the VoxDetect API.'
              : lastChecked
              ? `Checked ${new Date(lastChecked).toLocaleTimeString()}`
              : 'Checking…'}
          </p>
        </div>
      </div>
    </div>
  );
}
