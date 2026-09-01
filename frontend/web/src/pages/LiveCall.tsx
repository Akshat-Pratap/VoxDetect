/**
 * src/pages/LiveCall.tsx
 * The core live-call voice authenticity monitoring screen.
 */
import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useLiveMonitoring } from '@/hooks/useLiveMonitoring';
import { RiskGauge } from '@/components/risk/RiskGauge';
import { RiskTrendChart } from '@/components/risk/RiskTrendChart';
import { SignalBreakdown } from '@/components/risk/SignalBreakdown';
import { RiskBandBadge } from '@/components/risk/RiskBandBadge';
import { ORG_CONFIGS } from '@/types';
import { Mic, MicOff, AlertOctagon, ShieldAlert, SlidersHorizontal, Info } from 'lucide-react';

export function LiveCall() {
  const { org } = useOrganization();
  const orgPolicy = ORG_CONFIGS[org];

  // Context flags
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

  const displayScore = rollingRisk ?? riskScore;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-glass/[0.07] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="display text-2xl text-text-primary">
              Live Call Monitoring
            </h1>
            {isMonitoring && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                LIVE INTERCEPT ACTIVE
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Real-time acoustic & prosody stream analysis for synthetic speech detection.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!isMonitoring ? (
            <button
              onClick={startMonitoring}
              className="btn btn-primary btn-lg flex items-center gap-2"
            >
              <Mic className="w-5 h-5" />
              Start Live Monitoring
            </button>
          ) : (
            <button
              onClick={stopMonitoring}
              className="btn btn-danger btn-lg flex items-center gap-2"
            >
              <MicOff className="w-5 h-5" />
              Stop Monitoring
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {wsError && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg text-xs text-red-200 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0 text-red-400" />
          <span>{wsError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Gauge & Trend */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Risk Display Card */}
          <div className="card flex flex-col md:flex-row items-center justify-around p-6 gap-6">
            <div className="flex flex-col items-center">
              <RiskGauge score={displayScore} band={band} size={220} />
            </div>

            <div className="flex-1 space-y-4 max-w-sm">
              <div className="space-y-1">
                <span className="text-xs text-text-muted font-mono uppercase">Current Threat Status</span>
                <div className="flex items-center gap-3">
                  <RiskBandBadge band={band} severity={severity} size="lg" />
                  {flagged && (
                    <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> FLAGGED
                    </span>
                  )}
                </div>
              </div>

              {/* Recommended Action Box */}
              <div className="p-4 rounded-2xl bg-glass/[0.04] border border-glass/[0.06] space-y-1.5">
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-accent-soft" /> Policy Action ({org.toUpperCase()})
                </span>
                <p className="text-sm font-medium text-text-primary leading-relaxed">
                  {recommendedAction || orgPolicy.actions[band as keyof typeof orgPolicy.actions] || 'Awaiting live audio chunks for risk evaluation.'}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-glass/[0.03] border border-glass/[0.06]">
                  <span className="text-text-muted block">Chunks Analyzed</span>
                  <span className="font-mono font-bold text-text-primary text-base">{chunkCount}</span>
                </div>
                <div className="p-3 rounded-2xl bg-glass/[0.03] border border-glass/[0.06]">
                  <span className="text-text-muted block">Connection</span>
                  <span className="font-mono font-bold text-accent-soft capitalize">{wsStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rolling Risk History Chart */}
          <div className="card p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Live Risk Score Trend</h3>
                <p className="text-[11px] text-text-secondary">Rolling window score across streaming chunks</p>
              </div>
              <span className="text-xs font-mono text-text-muted">Threshold: {orgPolicy.thresholds.high_min}/100</span>
            </div>
            <RiskTrendChart data={history} threshold={orgPolicy.thresholds.high_min} />
          </div>
        </div>

        {/* Right 1 Col: Explainability & Context Controls */}
        <div className="space-y-6">
          {/* Signal Breakdown */}
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Signal Breakdown</h3>
              <p className="text-[11px] text-text-secondary">4-way multi-factor fusion metrics</p>
            </div>
            <SignalBreakdown signals={signals} />
          </div>

          {/* Call Context Toggles */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-accent" /> Call Scenario Context
                </h3>
                <p className="text-[11px] text-text-secondary">Simulate metadata risk multipliers</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { id: 'first_time_contact', label: 'First-Time Contact', desc: 'Caller not in trust history' },
                { id: 'high_value', label: 'High-Value Request', desc: 'Wire transfer, OTP or sensitive transaction' },
                { id: 'odd_hour', label: 'Unusual Call Time', desc: 'Call outside expected business hours' },
                { id: 'sensitive_data_request', label: 'Sensitive Data Request', desc: 'Asking for credentials or KYC docs' },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-glass/[0.03] border border-glass/[0.06] hover:bg-glass/[0.06] cursor-pointer transition-colors"
                >
                  <div className="pr-3">
                    <span className="text-sm font-medium text-text-primary block">{item.label}</span>
                    <span className="text-xs text-text-muted block mt-0.5">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={context[item.id as keyof typeof context] as boolean}
                    onChange={(e) =>
                      setContext((prev) => ({
                        ...prev,
                        [item.id]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded accent-accent cursor-pointer"
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
