/**
 * src/components/risk/RiskTrendChart.tsx
 * Real-time sparkline/trend chart of recent risk scores using Recharts.
 */
import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { RiskHistoryPoint } from '@/types';

interface Props {
  data: RiskHistoryPoint[];
  threshold?: number;
}

export function RiskTrendChart({ data, threshold = 60 }: Props) {
  const chartData = data.map((d, index) => ({
    time: index,
    score: Math.round(d.score),
    rolling: Math.round(d.rolling),
  }));

  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center border border-dashed border-bg-border rounded-lg bg-bg-surface/50 text-text-muted text-xs">
        No real-time data received yet. Start monitoring to stream scores.
      </div>
    );
  }

  return (
    <div className="w-full h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8b949e' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161b22',
              borderColor: '#2a3144',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#e6edf3',
            }}
            formatter={(value: any) => [`${value} / 100`, 'Risk Score']}
            labelFormatter={() => 'Live Chunk'}
          />
          <ReferenceLine
            y={threshold}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ value: `Alert (${threshold})`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
          />
          <Area
            type="monotone"
            dataKey="rolling"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#scoreGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
