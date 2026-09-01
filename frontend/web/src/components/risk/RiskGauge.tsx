/**
 * src/components/risk/RiskGauge.tsx
 * Animated SVG arc gauge displaying risk score 0–100.
 * Color transitions smoothly between low/medium/high/critical bands.
 */
import React, { useEffect, useRef } from 'react';

interface Props {
  score: number | null;   // 0-100, null = no data
  band: string | null;
  size?: number;          // SVG size in px (default: 240)
  showLabel?: boolean;
}

// Severity thresholds aligned with the backend org config (backend/config/organizations/*.json
// and OrganizationService._classify_severity). The real-vs-clone decision boundary is 7.5;
// a clone (>= 7.5) is always "high", and >= 85 escalates to "critical". Keeping these synced
// with the backend means the gauge color never contradicts the verdict/badge.
const HIGH_MIN = 7.5;      // >= this => flagged as cloned (matches VERDICT_CUTOFF)
const CRITICAL_MIN = 85;   // >= this => critical severity
const THRESHOLD_MARKS = [HIGH_MIN, CRITICAL_MIN];

function getBandColor(band: string | null, score: number | null): string {
  const b = band ?? getBandFromScore(score ?? 0);
  switch (b) {
    case 'critical': return '#dc2626';
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low':
    default: return '#22c55e';
  }
}

function getBandFromScore(score: number): string {
  if (score >= CRITICAL_MIN) return 'critical';
  if (score >= HIGH_MIN) return 'high';
  return 'low';
}

function getBandLabel(band: string | null): string {
  switch (band) {
    case 'critical': return 'CRITICAL RISK';
    case 'high': return 'HIGH RISK';
    case 'medium': return 'MEDIUM RISK';
    case 'low': return 'LOW RISK';
    default: return 'AWAITING DATA';
  }
}

function getBandSubtext(band: string | null): string {
  switch (band) {
    case 'critical': return 'Highly likely synthetic voice';
    case 'high': return 'Potential voice-cloning detected';
    case 'medium': return 'Anomalies detected, monitor';
    case 'low': return 'Voice appears authentic';
    default: return 'Start monitoring to analyze';
  }
}

export function RiskGauge({ score, band, size = 240, showLabel = true }: Props) {
  const canvasScore = score ?? 0;
  const color = getBandColor(band, canvasScore);
  const bandLabel = getBandLabel(band);
  const bandSubtext = getBandSubtext(band);

  // SVG arc parameters
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.78;
  const strokeWidth = (size / 2) * 0.1;

  // Arc spans 220 degrees (from 160° to 380° clockwise)
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
  const fillFraction = canvasScore / 100;
  const fillEnd = arcStart + totalAngle * fillFraction;
  const fillArc = canvasScore > 0 ? describeArc(arcStart, fillEnd) : '';

  // Circumference-based animation values
  const arcLength = totalAngle * radius;

  // Font sizes relative to gauge size
  const scoreFontSize = size * 0.2;
  const labelFontSize = size * 0.067;
  const subtextFontSize = size * 0.052;

  const prevScore = useRef<number | null>(null);

  useEffect(() => {
    prevScore.current = score;
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-3" role="img" aria-label={`Risk score: ${Math.round(canvasScore)} out of 100. ${bandLabel}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Track arc (background) */}
        <path
          d={bgArc}
          fill="none"
          stroke="var(--gauge-track)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Threshold markers */}
        {THRESHOLD_MARKS.map((threshold) => {
          const angle = arcStart + totalAngle * (threshold / 100);
          const inner = {
            x: cx + (radius - strokeWidth * 0.8) * Math.cos(angle),
            y: cy + (radius - strokeWidth * 0.8) * Math.sin(angle),
          };
          const outer = {
            x: cx + (radius + strokeWidth * 0.8) * Math.cos(angle),
            y: cy + (radius + strokeWidth * 0.8) * Math.sin(angle),
          };
          return (
            <line
              key={threshold}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--gauge-track-strong)"
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
            style={{
              transition: 'stroke 0.5s ease, d 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        )}

        {/* Score number */}
        <text
          x={cx}
          y={cy - size * 0.02}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={scoreFontSize}
          fontWeight="700"
          fill={score !== null ? color : 'var(--gauge-label)'}
          fontFamily="Inter, system-ui, sans-serif"
          style={{
            fontVariantNumeric: 'tabular-nums',
            transition: 'fill 0.5s ease',
          }}
        >
          {score !== null ? Math.round(canvasScore) : 'N/A'}
        </text>

        {/* /100 label */}
        {score !== null && (
          <text
            x={cx}
            y={cy + size * 0.12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={labelFontSize}
            fontWeight="500"
            fill="var(--gauge-label)"
            fontFamily="Inter, system-ui, sans-serif"
          >
            / 100
          </text>
        )}
      </svg>

      {showLabel && (
        <div className="text-center space-y-1">
          <div
            className="text-sm font-bold tracking-wider transition-colors duration-500"
            style={{ color: score !== null ? color : 'rgb(var(--text-muted) / 0.5)' }}
          >
            {bandLabel}
          </div>
          <div className="text-xs text-text-muted">
            {bandSubtext}
          </div>
        </div>
      )}
    </div>
  );
}
