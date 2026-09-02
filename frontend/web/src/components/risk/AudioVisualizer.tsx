/**
 * components/risk/AudioVisualizer.tsx
 * Live "mic is detecting" visualizer.
 * The MIC is the animation — it "beeps" (scale pulse) with sonar rings when
 * active. The equalizer bars react to the real audio level: flat when silent,
 * dancing when speaking. Colored by the current risk band.
 * Pure CSS animations + inline height. Respects reduced motion.
 */
import React from 'react';
import { Mic } from 'lucide-react';

export interface AudioVisualizerProps {
  active: boolean;
  band?: string | null;      // 'low' | 'high' | 'critical' | null
  flagged?: boolean;
  level?: number;            // 0-1 real-time audio level
}

const BAR_COUNT = 21;

export function AudioVisualizer({ active, band, flagged, level = 0 }: AudioVisualizerProps) {
  const tone = flagged || band === 'high' || band === 'critical' ? 'risk' : 'safe';

  const ringClass =
    tone === 'risk'
      ? 'border-[rgb(var(--risk-critical))] bg-[rgb(var(--risk-critical))] bg-opacity-10'
      : 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))] bg-opacity-10';

  const capsuleClass = active
    ? tone === 'risk'
      ? 'border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] shadow-[0_0_32px_-6px_rgba(239,68,68,0.5)]'
      : 'border-[rgba(20,184,166,0.35)] bg-[rgba(20,184,166,0.12)] shadow-[0_0_32px_-6px_rgba(20,184,166,0.5)]'
    : 'border-[rgb(var(--border-subtle))] bg-[var(--hover-bg)]';

  const micClass = active
    ? tone === 'risk'
      ? 'text-[rgb(var(--risk-critical))]'
      : 'text-[rgb(var(--accent-soft))]'
    : 'text-[rgb(var(--text-muted))]';

  const barClass =
    tone === 'risk'
      ? 'bg-[rgb(var(--risk-critical))] bg-opacity-70'
      : 'bg-[rgb(var(--accent))] bg-opacity-70';

  return (
    <div className="flex flex-col items-center justify-center gap-5 select-none">
      {/* Sonar rings + beeping mic */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {active && (
          <>
            <span
              aria-hidden="true"
              className={`absolute inset-0 rounded-full border ${ringClass} animate-[vox-ring_2s_ease-out_infinite]`}
            />
            <span
              aria-hidden="true"
              className={`absolute inset-0 rounded-full border ${ringClass} animate-[vox-ring_2s_ease-out_1s_infinite]`}
            />
          </>
        )}

        {/* Mic capsule — the beep */}
        <div
          className={`relative z-10 w-20 h-20 rounded-full border flex items-center justify-center transition-colors duration-300 ${
            capsuleClass
          } ${active ? 'animate-[vox-beep_1s_ease-in-out_infinite]' : ''}`}
        >
          <Mic className={`w-8 h-8 ${micClass}`} strokeWidth={1.8} />
        </div>
      </div>

      {/* Equalizer — flat when quiet, dances with the voice */}
      <div className="flex items-end gap-[5px] h-10" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          // Per-bar phase so bars rise independently
          const phase = 0.5 + 0.5 * Math.sin(i * 1.7 + 0.4);
          // Speaking → bars dance around the live level; silence → near-flat
          const h = active ? Math.max(3, level * phase * 44) : 3;
          return (
            <span
              key={i}
              className={`w-[5px] rounded-full ${barClass} transition-all duration-[60ms]`}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}