/**
 * src/components/risk/RiskGauge.tsx
 * Clean arc gauge displaying risk score 0–100.
 * Colors shift between teal (low), amber (medium), orange (high), red (critical).
 */
import React from 'react';

interface Props {
  score: number | null;
  band: string | null;
  size?: number;
  showLabel?: boolean;
}

const HIGH_MIN = 7.5;
const CRITICAL_MIN = 85;

function getBandColor(band: string | null, score: number): string {
  const b = band ?? getBandFromScore(score);
  switch (b) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#f59e0b';
    case 'low':
    default: return '#14b8a6';
  }
}

function getBandFromScore(score: number): string {
  if (score >= CRITICAL_MIN) return 'critical';
  if (score >= HIGH_MIN) return 'high';
  return 'low';
}

export function getBandLabel(band: string | null): string {
  switch (band) {
    case 'critical': return 'CRITICAL';
    case 'high': return 'HIGH RISK';
    case 'medium': return 'MEDIUM';
    case 'low': return 'AUTHENTIC';
    default: return 'NO DATA';
  }
}

export function getBandSubtext(band: string | null): string {
  switch (band) {
    case 'critical': return 'Highly likely synthetic voice';
    case 'high': return 'Potential voice-cloning detected';
    case 'medium': return 'Anomalies detected — monitor';
    case 'low': return 'Voice appears authentic';
    default: return 'Awaiting analysis';
  }
}

export function RiskGauge({ score, band, size = 200, showLabel = true }: Props) {
  const val = score ?? 0;
  const color = getBandColor(band, val);
  const bandLabel = getBandLabel(band);
  const bandSubtext = getBandSubtext(band);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.75;
  const strokeWidth = (size / 2) * 0.09;

  const arcStart = 160 * (Math.PI / 180);
  const arcEnd = 380 * (Math.PI / 180);
  const totalAngle = arcEnd - arcStart;

  function polarToCartesian(angle: number) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  function describeArc(fromAngle: number, toAngle: number) {
    const start = polarToCartesian(fromAngle);
    const end = polarToCartesian(toAngle);
    const largeArc = toAngle - fromAngle > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  const bgArc = describeArc(arcStart, arcEnd);
  const fillFraction = val / 100;
  const fillEnd = arcStart + totalAngle * fillFraction;
  const fillArc = val > 0 ? describeArc(arcStart, fillEnd) : '';

  const scoreFontSize = size * 0.2;
  const labelFontSize = size * 0.055;
  const subtextFontSize = size * 0.045;

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`Risk score: ${Math.round(val)} out of 100. ${bandLabel}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Background track */}
        <path
          d={bgArc}
          fill="none"
          className="gauge-track"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Threshold ticks */}
        {[HIGH_MIN, CRITICAL_MIN].map((threshold) => {
          const angle = arcStart + totalAngle * (threshold / 100);
          const inner = {
            x: cx + (radius - strokeWidth * 0.9) * Math.cos(angle),
            y: cy + (radius - strokeWidth * 0.9) * Math.sin(angle),
          };
          const outer = {
            x: cx + (radius + strokeWidth * 0.9) * Math.cos(angle),
            y: cy + (radius + strokeWidth * 0.9) * Math.sin(angle),
          };
          return (
            <line
              key={threshold}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              className="gauge-tick"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Fill arc */}
        {fillArc && (
          <path
            d={fillArc}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="gauge-arc"
          />
        )}

        {/* Score number */}
        <text
          x={cx}
          y={cy - size * 0.01}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={scoreFontSize}
          fontWeight="700"
          fill={score !== null ? color : 'rgb(var(--text-muted) / 0.6)'}
          fontFamily="'JetBrains Mono', monospace"
          className="score-number"
        >
          {score !== null ? Math.round(val) : '—'}
        </text>

        {/* /100 */}
        {score !== null && (
          <text
            x={cx}
            y={cy + size * 0.1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={labelFontSize}
            fontWeight="500"
            fill="rgb(var(--text-muted) / 0.7)"
            fontFamily="'JetBrains Mono', monospace"
          >
            / 100
          </text>
        )}
      </svg>

      {showLabel && (
        <div className="text-center space-y-0.5">
          <div
            className="text-xs font-semibold tracking-wider"
            style={{ color: score !== null ? color : 'rgb(var(--text-muted) / 0.7)' }}
          >
            {bandLabel}
          </div>
          <div className="text-[10px] text-[rgb(var(--text-muted))]">
            {bandSubtext}
          </div>
        </div>
      )}
    </div>
  );
}
