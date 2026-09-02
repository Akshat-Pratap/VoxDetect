/**
 * src/pages/LiveCall.tsx — Live call voice authenticity monitoring
 */
import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useLiveMonitoring } from '@/hooks/useLiveMonitoring';
import { RiskGauge, getBandSubtext } from '@/components/risk/RiskGauge';
import { RiskTrendChart } from '@/components/risk/RiskTrendChart';
import { SignalBreakdown } from '@/components/risk/SignalBreakdown';
import { RiskBandBadge } from '@/components/risk/RiskBandBadge';
import { AudioVisualizer } from '@/components/risk/AudioVisualizer';
import { ORG_CONFIGS } from '@/types';
import { Mic, MicOff, AlertOctagon, ShieldAlert, Info, Radio } from 'lucide-react';

export function LiveCall() {
  const { org } = useOrganization();
  const orgPolicy = ORG_CONFIGS[org];

  const [context, setContext] = useState({
    first_time_contact: false,
    high_value: false,
    odd_hour: false,
    sensitive_data_request: false,
    enrolled_speaker_id: null as string | null,
  });

  const {
    wsStatus,
    riskScore,
    rollingRisk,
    band,
    severity,
    flagged,
    recommendedAction,
    signals,
    history,
    chunkCount,
    wsError,
    startMonitoring,
    stopMonitoring,
    isMonitoring,
  } = useLiveMonitoring(org, context);

  const displayScore = riskScore ?? rollingRisk;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[rgb(var(--text-primary))]">
            Live Call Monitoring
          </h1>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
            Stream your microphone and classify each chunk in real time
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isMonitoring ? (
            <button onClick={startMonitoring} className="btn btn-primary">
              <Mic className="w-4 h-4" /> Start Monitoring
            </button>
          ) : (
            <button onClick={stopMonitoring} className="btn btn-danger">
              <MicOff className="w-4 h-4" /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {wsError && (
        <div className="p-2.5 rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-xs text-red-300 flex items-center gap-2">
          <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono">{wsError}</span>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Hero + Trend */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hero */}
          <div className="card p-0 overflow-hidden">
            {/* Card toolbar */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[rgb(var(--border-subtle))] bg-[var(--hover-bg)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <Radio className="w-4 h-4 text-[rgb(var(--accent-soft))] shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">
                    Live Voice Analysis
                  </span>
                  <span className="text-[10px] text-[rgb(var(--text-muted))] block truncate">
                    Mic feed → wav2vec2-XLSR classification
                  </span>
                </div>
              </div>

              {isMonitoring ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.25)] text-[rgb(var(--risk-critical))] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--risk-critical))] animate-pulse" />
                  LIVE
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] text-[rgb(var(--text-muted))] shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--text-muted))]" />
                  IDLE
                </span>
              )}
            </div>

            {/* Mic centered on top; gauge + status side by side below */}
            <div className="flex flex-col items-center py-8 px-6">
              <AudioVisualizer active={isMonitoring} band={band} flagged={flagged} />

              <div className="mt-16 w-full grid grid-cols-1 sm:grid-cols-2 gap-10 items-center">
                {/* Left: semicircle gauge */}
                <div className="flex justify-center -ml-6">
                  <RiskGauge score={displayScore} band={band} size={160} showLabel={false} />
                </div>

                {/* Right: status, horizontally aligned with the semicircle */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[rgb(var(--text-muted))]">
                      Threat Status
                    </span>
                    <div className="flex items-center gap-2">
                      <RiskBandBadge band={band} severity={severity} size="lg" />
                      {flagged && (
                        <span className="text-[10px] font-mono font-semibold text-[rgb(var(--risk-high))] flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> FLAGGED
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[rgb(var(--text-muted))] leading-snug text-center min-h-[15px]">
                      {band ? getBandSubtext(band) : 'Awaiting analysis'}
                    </span>
                  </div>

                  <div className="w-full flex items-center justify-center gap-2 pt-1">
                    <span className="text-[9px] font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <Info className="w-3 h-3" /> Policy ({org.toUpperCase()})
                    </span>
                    <span className="text-[11px] text-[rgb(var(--text-secondary))] leading-snug text-center">
                      {recommendedAction || orgPolicy.actions[band as keyof typeof orgPolicy.actions] || 'Awaiting analysis'}
                    </span>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-md bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] text-center">
                      <span className="text-[rgb(var(--text-muted))] block">Chunks</span>
                      <span className="font-mono font-semibold text-[rgb(var(--text-primary))]">{chunkCount}</span>
                    </div>
                    <div className="p-2.5 rounded-md bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] text-center">
                      <span className="text-[rgb(var(--text-muted))] block">Status</span>
                      <span className="font-mono font-semibold text-[rgb(var(--accent-soft))] capitalize">{wsStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trend chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Risk Trend</h3>
                <p className="text-[10px] text-[rgb(var(--text-muted))]">Rolling score across chunks</p>
              </div>
              <span className="text-[10px] font-mono text-[rgb(var(--text-muted))]">
                Threshold: {orgPolicy.thresholds.high_min}
              </span>
            </div>
            <RiskTrendChart data={history} threshold={orgPolicy.thresholds.high_min} />
          </div>
        </div>

        {/* Right: Signals + Context */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">Signal Breakdown</h3>
            <SignalBreakdown signals={signals} />
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">Call Context</h3>
            <div className="space-y-2">
              {[
                { id: 'first_time_contact', label: 'First-Time Contact', desc: 'Not in trust history' },
                { id: 'high_value', label: 'High-Value Request', desc: 'Wire transfer, OTP' },
                { id: 'odd_hour', label: 'Unusual Time', desc: 'Outside business hours' },
                { id: 'sensitive_data_request', label: 'Sensitive Data', desc: 'Credentials, KYC' },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-[var(--hover-bg)] cursor-pointer transition-colors"
                >
                  <div>
                    <span className="text-xs font-medium text-[rgb(var(--text-primary))] block">{item.label}</span>
                    <span className="text-[10px] text-[rgb(var(--text-muted))]">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={context[item.id as keyof typeof context] as boolean}
                    onChange={(e) =>
                      setContext((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    className="w-3.5 h-3.5 rounded accent-[rgb(var(--accent))] cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}