/**
 * src/pages/Settings.tsx
 * Organization policies, connection URLs, and system info.
 */
import React from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { useSignalSettings } from '@/context/SignalSettingsContext';
import { Select } from '@/components/ui/Select';
import { ORG_CONFIGS, OrgType } from '@/types';
import { Settings as SettingsIcon, Sliders, Shield, Database, Radio, Activity } from 'lucide-react';

export function Settings() {
  const { org, setOrg } = useOrganization();
  const { health } = useHealthCheck();
  const { fusion, setSignal, anySecondaryEnabled } = useSignalSettings();
  const policy = ORG_CONFIGS[org];

  const signalRows = [
    { key: 'model' as const, name: 'Deepfake Audio Model', tag: 'Verdict', desc: 'Wav2Vec2 acoustic artifacts · decisive', weight: '70%' },
    { key: 'prosody_anomaly' as const, name: 'Prosody Anomaly', tag: 'Ref.', desc: 'Pitch variance, pause rhythm & tempo', weight: '15%' },
    { key: 'voiceprint_risk' as const, name: 'Voiceprint Mismatch', tag: 'Ref.', desc: 'Distance to enrolled speaker', weight: '10%' },
    { key: 'context_risk' as const, name: 'Call Context Risk', tag: 'Ref.', desc: 'Metadata flags & scenario', weight: '5%' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="display text-2xl text-text-primary">System Settings & Policies</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure active organization response matrix and backend connection endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization Matrix */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-glass/[0.07] pb-3">
            <Sliders className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-text-primary">Organization Threat Matrix</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1">Active Organization Profile</label>
              <Select
                value={org}
                onChange={(v) => setOrg(v as OrgType)}
                fullWidth
                ariaLabel="Active organization profile"
                options={[
                  { value: 'bank', label: 'Bank', sublabel: 'Strict Financial Thresholds' },
                  { value: 'enterprise', label: 'Enterprise', sublabel: 'Standard Identity Verification' },
                  { value: 'government', label: 'Government', sublabel: 'Maximum Security Escalation' },
                ]}
              />
            </div>

            <div className="p-3 bg-bg-surface rounded-lg border border-bg-border text-xs space-y-2">
              <span className="font-bold text-text-primary block">Active Thresholds (0 to 100)</span>
              <div className="flex justify-between text-green-400">
                <span>Low Risk Ceiling:</span>
                <span className="font-mono font-bold">&le; {policy.thresholds.low_max}</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>Medium Risk Ceiling:</span>
                <span className="font-mono font-bold">&le; {policy.thresholds.medium_max}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>High Risk Floor:</span>
                <span className="font-mono font-bold">&ge; {policy.thresholds.high_min}</span>
              </div>
              <div className="flex justify-between text-red-300 font-bold">
                <span>Critical Trigger:</span>
                <span className="font-mono">&ge; {policy.thresholds.critical_min}</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Topology */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-glass/[0.07] pb-3">
            <Radio className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-text-primary">Connection Endpoints</h2>
          </div>

          <div className="text-xs space-y-3">
            <div>
              <span className="text-text-muted block">REST API Base:</span>
              <span className="font-mono text-text-primary bg-bg-surface px-2 py-1 rounded border border-bg-border block mt-1">
                {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block">WebSocket Streaming:</span>
              <span className="font-mono text-text-primary bg-bg-surface px-2 py-1 rounded border border-bg-border block mt-1">
                {import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/v1/stream
              </span>
            </div>

            <div className="pt-3 border-t border-bg-border space-y-1">
              <span className="text-text-muted block">Service Telemetry:</span>
              <div className="flex justify-between text-[11px]">
                <span className="text-text-secondary">Version:</span>
                <span className="font-mono text-text-primary">{health?.version || '0.1.0'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-text-secondary">App Name:</span>
                <span className="text-text-primary">{health?.service || 'VoxDetect'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Signal Fusion Toggles */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-glass/[0.07] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            <h2 className="text-sm font-bold text-text-primary">Multi-Signal Fusion</h2>
          </div>
          {anySecondaryEnabled && (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-400">
              Fusion Active
            </span>
          )}
        </div>

        <div className="text-xs text-text-secondary">
          4-way multi-factor fusion metrics. Only <span className="text-text-primary font-semibold">Deepfake
          Audio Model</span> is on by default (the raw classifier drives the verdict). Toggle the other
          signals to include them in a weighted verdict and watch the risk score change.
        </div>

        <div className="space-y-2">
          {signalRows.map((sig) => {
            const enabled = fusion[sig.key];
            return (
              <div
                key={sig.key}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                  enabled
                    ? 'bg-accent/10 border-transparent'
                    : 'bg-glass/[0.02] border-glass/[0.06]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{sig.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold ${
                        sig.key === 'model'
                          ? 'bg-accent/20 text-accent-soft'
                          : 'bg-glass/[0.06] text-text-muted'
                      }`}
                    >
                      {sig.tag}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">w {sig.weight}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{sig.desc}</p>
                </div>
                <label className="toggle shrink-0" aria-label={`Toggle ${sig.name}`}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => setSignal(sig.key, !enabled)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-bg-surface rounded-lg border border-bg-border text-xs text-text-secondary">
          {anySecondaryEnabled ? (
            <>When fusion is enabled, enabled signals vote with renormalised weights and the sigmoid
              squashes the weighted sum to 0 to 100. Disable a signal and its weight drops out of the
              verdict.</>
          ) : (
            <>Model-only mode: the verdict equals the deepfake classifier. Enable any secondary signal
              to switch to the weighted fusion verdict.</>
          )}
        </div>
      </div>
    </div>
  );
}
