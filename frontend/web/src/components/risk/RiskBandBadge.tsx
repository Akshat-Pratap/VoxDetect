/**
 * src/components/risk/RiskBandBadge.tsx
 * Compact risk band badge with SOC-appropriate colors.
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
    color: 'text-[rgb(var(--risk-low))]',
    bg: 'bg-[rgb(var(--risk-low-bg))]',
    border: 'border-[rgb(var(--risk-low))] border-opacity-20',
  },
  medium: {
    label: 'MED',
    color: 'text-[rgb(var(--risk-medium))]',
    bg: 'bg-[rgb(var(--risk-medium-bg))]',
    border: 'border-[rgb(var(--risk-medium))] border-opacity-20',
  },
  high: {
    label: 'HIGH',
    color: 'text-[rgb(var(--risk-high))]',
    bg: 'bg-[rgb(var(--risk-high-bg))]',
    border: 'border-[rgb(var(--risk-high))] border-opacity-20',
  },
  critical: {
    label: 'CRIT',
    color: 'text-[rgb(var(--risk-critical))]',
    bg: 'bg-[rgb(var(--risk-critical-bg))]',
    border: 'border-[rgb(var(--risk-critical))] border-opacity-25',
  },
};

const SIZE_CLASS = {
  sm: 'text-[9px] px-1.5 py-0.5',
  md: 'text-[10px] px-2 py-0.5',
  lg: 'text-xs px-2.5 py-1',
};

export function RiskBandBadge({ band, severity, size = 'md' }: Props) {
  const key = severity || band || 'low';
  const config = BAND_CONFIG[key] ?? BAND_CONFIG['low'];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-semibold font-mono tracking-wider
        ${config.color} ${config.bg} ${config.border} ${SIZE_CLASS[size]}`}
      role="status"
      aria-label={`Risk level: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
