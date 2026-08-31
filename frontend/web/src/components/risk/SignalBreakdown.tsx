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
      description: 'Wav2Vec2 acoustic/spectral artifacts',
      value: signals.model,
      weight: '50%',
      type: 'risk',
    },
    {
      name: 'Prosody Anomaly',
      description: 'Pitch variance, pause rhythm & tempo',
      value: signals.prosody_anomaly,
      weight: '25%',
      type: 'anomaly',
    },
    {
      name: 'Voiceprint Mismatch',
      description: 'Cosine distance to enrolled speaker',
      value: signals.voiceprint_risk,
      weight: '15%',
      type: 'risk',
    },
    {
      name: 'Call Context Risk',
      description: 'Metadata flags & abnormal scenario',
      value: signals.context_risk,
      weight: '10%',
      type: 'risk',
    },
  ];

  return (
    <div className="space-y-3">
      {signalConfigs.map((sig) => {
        const hasVal = sig.value !== null && sig.value !== undefined;
        const pct = hasVal ? Math.min(100, Math.max(0, Math.round(sig.value! * 100))) : 0;
        
        let barColor = 'bg-green-500';
        if (pct >= 70) barColor = 'bg-red-500';
        else if (pct >= 35) barColor = 'bg-yellow-500';

        return (
          <div key={sig.name} className="bg-bg-surface p-3 rounded-lg border border-bg-border">
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="text-xs font-semibold text-text-primary">{sig.name}</span>
                <span className="ml-2 text-[10px] text-text-muted">Weight: {sig.weight}</span>
              </div>
              <span className="text-xs font-mono font-bold text-text-primary">
                {hasVal ? `${pct}%` : 'N/A'}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary mb-1.5">{sig.description}</p>
            <div className="w-full h-1.5 bg-bg-card rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
