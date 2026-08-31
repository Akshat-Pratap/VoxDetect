/**
 * src/pages/Dashboard.tsx
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { useHealthCheck } from '@/hooks/useHealthCheck';
import { ORG_CONFIGS } from '@/types';
import {
  ShieldCheck,
  Radio,
  FileAudio,
  UserCheck,
  Bell,
  Activity,
  ArrowRight,
  Server,
  Cpu,
  Database,
} from 'lucide-react';

export function Dashboard() {
  const { org } = useOrganization();
  const { health } = useHealthCheck();
  const orgPolicy = ORG_CONFIGS[org];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="card p-8 bg-gradient-to-r from-bg-surface via-bg-elevated to-bg-card border-bg-border relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Real-Time Voice Authenticity Engine
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            AI-Powered Voice Cloning & Impersonation Prevention
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Multi-signal acoustic defense combining fine-tuned Wav2Vec2, prosody anomaly detection,
            ECAPA-TDNN speaker verification, and contextual risk scoring.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Link to="/live-call" className="btn btn-primary btn-lg flex items-center gap-2 shadow-glow-medium">
              <Radio className="w-4 h-4 animate-pulse" /> Start Live Monitoring
            </Link>
            <Link to="/analyze" className="btn btn-ghost btn-lg flex items-center gap-2">
              <FileAudio className="w-4 h-4" /> Batch Clip Analysis
            </Link>
          </div>
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center opacity-10 pointer-events-none">
          <ShieldCheck className="w-72 h-72 text-accent" />
        </div>
      </div>

      {/* System Status & Policy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Backend Status Card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Backend Engine</span>
            <Server className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text-primary">
              {health?.status === 'ok' ? 'Online' : 'Checking...'}
            </span>
            <span className="text-xs text-text-muted">FastAPI Service</span>
          </div>
          <div className="text-[11px] text-text-secondary space-y-1 pt-2 border-t border-bg-border">
            <div className="flex justify-between">
              <span>Database:</span>
              <span className="font-mono text-green-400">{health?.database || 'SQLite / Memory'}</span>
            </div>
            <div className="flex justify-between">
              <span>ML Inference:</span>
              <span className="font-mono text-accent">{health?.ml_service || 'Wav2Vec2 Ready'}</span>
            </div>
          </div>
        </div>

        {/* Current Profile Card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Active Policy</span>
            <Cpu className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono capitalize text-text-primary">{org} Profile</span>
          </div>
          <div className="text-[11px] text-text-secondary space-y-1 pt-2 border-t border-bg-border">
            <div className="flex justify-between">
              <span>High Risk Threshold:</span>
              <span className="font-mono text-red-400">&gt; {orgPolicy.thresholds.high_min} / 100</span>
            </div>
            <div className="flex justify-between">
              <span>Critical Action:</span>
              <span className="text-text-primary truncate max-w-[150px]">Freeze / Escalate</span>
            </div>
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase">Quick Navigation</span>
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <div className="space-y-2 pt-1">
            <Link
              to="/voiceprints"
              className="flex items-center justify-between p-2 rounded bg-bg-surface hover:bg-bg-elevated text-xs transition-colors"
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-accent" /> Voiceprint Enrollment
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
            </Link>
            <Link
              to="/alerts"
              className="flex items-center justify-between p-2 rounded bg-bg-surface hover:bg-bg-elevated text-xs transition-colors"
            >
              <span className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-accent" /> Alert Evidence History
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
