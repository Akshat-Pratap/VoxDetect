/**
 * src/pages/Settings.tsx — Organization policies and system config
 */
import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { useSignalSettings } from '@/context/SignalSettingsContext';
import { ORG_CONFIGS, OrgType } from '@/types';
import { Shield, Radio, Activity } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import type { SelectOption } from '@/components/ui/Select';

const policyOptions: SelectOption[] = [
  { value: 'bank', label: 'Bank — Strict Financial' },
  { value: 'enterprise', label: 'Enterprise — Standard' },
  { value: 'government', label: 'Government — Maximum Security' },
];

export function Settings() {
  const { org, setOrg } = useOrganization();
  const { health } = useHealthCheck();
  const { fusion, setSignal } = useSignalSettings();
  const policy = ORG_CONFIGS[org];

  const signalRows = [
    { key: 'model' as const, name: 'Deepfake Model', weight: '70%', desc: 'Wav2Vec2 acoustic artifacts', alwaysOn: true },
    { key: 'prosody_anomaly' as const, name: 'Prosody', weight: '15%', desc: 'Pitch, pause, tempo', alwaysOn: false },
    { key: 'voiceprint_risk' as const, name: 'Voiceprint', weight: '10%', desc: 'Speaker distance', alwaysOn: false },
    { key: 'context_risk' as const, name: 'Context', weight: '5%', desc: 'Metadata flags', alwaysOn: false },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-[rgb(var(--text-primary))]">Settings</h1>
        <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
          Organization policies and system configuration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Org policy */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgb(var(--border-subtle))]">
            <Shield className="w-4 h-4 text-[rgb(var(--accent-soft))]" />
            <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Organization Policy</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-[rgb(var(--text-muted))] block mb-1.5">Active Profile</label>
              <Select
                value={org}
                onChange={(v) => setOrg(v as OrgType)}
                options={policyOptions}
                ariaLabel="Active organization policy"
                fullWidth
              />
            </div>

            <div className="p-3 rounded-md bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] text-xs space-y-2">
              <span className="font-semibold text-[rgb(var(--text-primary))] block mb-1">Thresholds</span>
              <div className="flex justify-between">
                <span className="text-[rgb(var(--text-secondary))]">Low ceiling</span>
                <span className="font-mono text-[rgb(var(--risk-low))]">&le; {policy.thresholds.low_max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[rgb(var(--text-secondary))]">High floor</span>
                <span className="font-mono text-[rgb(var(--risk-high))]">&ge; {policy.thresholds.high_min}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[rgb(var(--text-secondary))]">Critical trigger</span>
                <span className="font-mono text-[rgb(var(--risk-critical))]">&ge; {policy.thresholds.critical_min}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgb(var(--border-subtle))]">
            <Radio className="w-4 h-4 text-[rgb(var(--accent-soft))]" />
            <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Endpoints</h2>
          </div>

          <div className="text-xs space-y-3">
            <div>
              <span className="text-[rgb(var(--text-muted))] block mb-1">REST API</span>
              <span className="font-mono text-[rgb(var(--text-primary))] p-2 rounded bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] block">
                {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
              </span>
            </div>
            <div>
              <span className="text-[rgb(var(--text-muted))] block mb-1">WebSocket</span>
              <span className="font-mono text-[rgb(var(--text-primary))] p-2 rounded bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] block">
                {import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/v1/stream
              </span>
            </div>
            <div className="pt-2 border-t border-[rgb(var(--border-subtle))] space-y-1">
              <div className="flex justify-between">
                <span className="text-[rgb(var(--text-muted))]">Version</span>
                <span className="font-mono text-[rgb(var(--text-primary))]">{health?.version || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fusion toggles */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgb(var(--border-subtle))]">
          <Activity className="w-4 h-4 text-[rgb(var(--accent-soft))]" />
          <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Multi-Signal Fusion</h2>
        </div>

        <div className="space-y-2.5">
          {signalRows.map((sig) => {
            const enabled = fusion[sig.key];
            return (
              <div
                key={sig.key}
                className="p-3.5 rounded-lg flex items-center justify-between transition-colors bg-[var(--hover-bg)] hover:bg-[var(--hover-bg-strong)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[rgb(var(--text-primary))]">{sig.name}</span>
                  <span className="text-xs font-mono text-[rgb(var(--text-secondary))]">w{sig.weight}</span>
                  <span className="text-xs text-[rgb(var(--text-muted))] hidden sm:inline">{sig.desc}</span>
                </div>
                {sig.alwaysOn ? (
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-[rgb(var(--accent))] text-white shadow-sm select-none">
                    ALWAYS ON
                  </span>
                ) : (
                  <button
                    onClick={() => setSignal(sig.key, !enabled)}
                    className={`
                      relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                      transition-colors duration-200 ease-in-out
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-2
                      ${enabled
                        ? 'bg-[rgb(var(--accent))]'
                        : 'bg-[rgb(var(--border))]'
                      }
                    `}
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Toggle ${sig.name}`}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md
                        transform transition duration-200 ease-in-out mt-0.5
                        ${enabled ? 'translate-x-[22px] ml-0' : 'translate-x-[2px]'}
                      `}
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
