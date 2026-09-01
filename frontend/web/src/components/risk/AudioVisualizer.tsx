/**
 * components/risk/AudioVisualizer.tsx
 * Live "mic is detecting" visualizer: animated waveform bars + pulsing ring.
 * Colored by the current risk band. Pure CSS animations (GPU-accelerated,
 * transform/opacity only) so it stays buttery at 60fps. Respects reduced motion.
 */
import React from 'react';
import { Mic } from 'lucide-react';

export interface AudioVisualizerProps {
  active: boolean;
  band?: string | null;      // 'low' | 'high' | 'critical' | null
  flagged?: boolean;
}

const BAR_COUNT = 21;

export function AudioVisualizer({ active, band, flagged }: AudioVisualizerProps) {
  const tone = flagged || band === 'high' || band === 'critical' ? 'risk' : 'safe';
  const ring =
    tone === 'risk'
      ? 'from-red-500/50 via-red-500/20 to-transparent'
      : 'from-emerald-500/50 via-emerald-500/20 to-transparent';
  const barTone = tone === 'risk' ? 'bg-red-400' : 'bg-emerald-400';

  return (
    <div className="flex flex-col items-center justify-center gap-4 select-none">
      {/* Pulsing ring + mic */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Expanding detection pulse (only when active) */}
        {active && (
          <span
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${ring} animate-[vox-ring_1.8s_ease-out_infinite]`}
            aria-hidden="true"
          />
        )}
        {/* Mic capsule */}
        <div
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300 ${
            active
              ? tone === 'risk'
                ? 'bg-red-500/15 shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]'
                : 'bg-emerald-500/15 shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]'
              : ''
          }`}
        >
          <Mic
            className={`w-9 h-9 ${
              active
                ? tone === 'risk'
                  ? 'text-red-400'
                  : 'text-emerald-400'
                : 'text-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Waveform bars */}
      <div className="flex items-center gap-1 h-12" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          // Deterministic per-bar peak so the idle bars are still varied
          const peak = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + 0.4));
          const delay = (i % 7) * 0.09;
          return (
            <span
              key={i}
              className={`w-1.5 rounded-full ${barTone} ${
                active ? 'animate-[vox-bar_1.1s_ease-in-out_infinite]' : ''
              }`}
              style={{
                height: active ? undefined : `${Math.round(20 + peak * 28)}px`,
                animationDelay: active ? `${delay}s` : undefined,
                animationDuration: '1.1s',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
