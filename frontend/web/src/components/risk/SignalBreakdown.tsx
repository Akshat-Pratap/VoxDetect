/**
 * src/components/risk/SignalBreakdown.tsx
 * Visual progress bars for the 4 fused signals.
 */
import React from 'react';
import type { SignalBreakdownData } from '@/types';

interface Props {
  signals: SignalBreakdownData;
}

export function SignalBreakdown({ signals }: Props) {
  const signalConfigs = [
    {
      name: 'Deepfake Audio Model',
      description: 'Wav2Vec2 acoustic artifacts · decisive',
      value: signals.model,
      weight: 'Verdict',
      type: 'risk',
    },
    {
      name: 'Prosody Anomaly',
      description: 'Pitch variance, pause rhythm & tempo',
      value: signals.prosody_anomaly,
      weight: 'Ref.',
      type: 'anomaly',
    },
    {
      name: 'Voiceprint Mismatch',
      description: 'Distance to enrolled speaker',
      value: signals.voiceprint_risk,
      weight: 'Ref.',
      type: 'risk',
    },
    {
      name: 'Call Context Risk',
      description: 'Metadata flags & scenario',
      value: signals.context_risk,
      weight: 'Ref.',
      type: 'risk',
    },
  ];

  return (
    <div className="space-y-3">
      {signalConfigs.map((sig) => {
        const hasVal = sig.value !== null && sig.value !== undefined;
        const pct = hasVal ? Math.min(100, Math.max(0, Math.round(sig.value! * 100))) : 0;

        const decisive = sig.weight === 'Verdict';
        let barGradient = 'from-emerald-500/70 to-green-400/70';
        if (pct >= 70) barGradient = 'from-rose-500/80 to-red-400/80';
        else if (pct >= 35) barGradient = 'from-amber-500/70 to-yellow-400/70';
        if (decisive && pct < 35) barGradient = 'from-violet-500/70 to-accent-soft/70';

        return (
          <div key={sig.name} className="rounded-2xl bg-glass/[0.04] border border-glass/[0.06] p-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                {sig.name}
                <span
                  className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold ${
                    decisive
                      ? 'bg-accent/20 text-accent-soft'
                      : 'bg-glass/[0.06] text-text-muted'
                  }`}
                >
                  {sig.weight}
                </span>
              </span>
              <span className="text-sm font-semibold font-mono text-text-primary">
                {hasVal ? `${pct}%` : 'N/A'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-2">{sig.description}</p>
            <div className="w-full h-2 bg-glass/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700`}
                style={{ width: `${decisive ? Math.max(pct, 8) : pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
