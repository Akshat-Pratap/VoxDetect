/**
 * src/components/risk/SignalBreakdown.tsx
 * Horizontal signal bars for the 4 fused detectors.
 */
import React from 'react';
import { useSignalSettings } from '@/context/SignalSettingsContext';
import type { SignalBreakdownData } from '@/types';

interface Props {
  signals: SignalBreakdownData;
}

export function SignalBreakdown({ signals }: Props) {
  const { fusion } = useSignalSettings();

  const signalConfigs = [
    {
      name: 'Deepfake Model',
      value: signals.model,
      key: 'model' as const,
      decisive: true,
    },
    {
      name: 'Prosody',
      value: signals.prosody_anomaly,
      key: 'prosody_anomaly' as const,
      decisive: false,
    },
    {
      name: 'Voiceprint',
      value: signals.voiceprint_risk,
      key: 'voiceprint_risk' as const,
      decisive: false,
    },
    {
      name: 'Context',
      value: signals.context_risk,
      key: 'context_risk' as const,
      decisive: false,
    },
  ];

  return (
    <div className="space-y-3">
      {signalConfigs.map((sig) => {
        const hasVal = sig.value !== null && sig.value !== undefined;
        const pct = hasVal ? Math.min(100, Math.max(0, Math.round(sig.value! * 100))) : 0;
        const inVerdict = sig.decisive || fusion[sig.key];

        // Color: teal for low, amber for mid, orange/red for high
        let barColor = 'bg-[rgb(var(--risk-low))]';
        if (pct >= 70) barColor = 'bg-[rgb(var(--risk-high))]';
        else if (pct >= 35) barColor = 'bg-[rgb(var(--risk-medium))]';

        return (
          <div key={sig.name}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[rgb(var(--text-primary))]">
                  {sig.name}
                </span>
                {sig.decisive && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[rgb(var(--accent))] text-white">
                    Decisive
                  </span>
                )}
                {inVerdict && !sig.decisive && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[rgb(var(--text-muted))]">
                    In verdict
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-semibold text-[rgb(var(--text-primary))]">
                {hasVal ? `${pct}%` : '—'}
              </span>
            </div>

            {/* Bar */}
            <div className="w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} signal-bar-fill`}
                style={{ width: hasVal ? `${Math.max(pct, sig.decisive ? 6 : 0)}%` : '0%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
