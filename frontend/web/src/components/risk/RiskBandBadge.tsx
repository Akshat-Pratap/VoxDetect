/**
 * src/components/risk/RiskBandBadge.tsx
 * Displays a risk band badge with appropriate color and icon.
 */
import React from 'react';

interface Props {
  band: string | null;
  severity?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const BAND_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low: {
    label: 'LOW',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
  },
  medium: {
    label: 'MEDIUM',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/25',
  },
  high: {
    label: 'HIGH',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
  },
  critical: {
    label: 'CRITICAL',
    color: 'text-red-300',
    bg: 'bg-red-900/30',
    border: 'border-red-400/40',
  },
};

const SIZE_CLASS = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export function RiskBandBadge({ band, severity, size = 'md' }: Props) {
  const key = severity || band || 'low';
  const config = BAND_CONFIG[key] ?? BAND_CONFIG['low'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wider
        ${config.color} ${config.bg} ${config.border} ${SIZE_CLASS[size]}`}
      role="status"
      aria-label={`Risk level: ${config.label}`}
    >
      {config.label} RISK
    </span>
  );
}
