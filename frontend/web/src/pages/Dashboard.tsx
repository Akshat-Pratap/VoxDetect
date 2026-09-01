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
  ArrowRight,
  Server,
  Cpu,
} from 'lucide-react';

export function Dashboard() {
  const { org } = useOrganization();
  const { health } = useHealthCheck();
  const orgPolicy = ORG_CONFIGS[org];
  const online = health?.status === 'ok';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero */}
      <section className="glass p-8 md:p-12">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/25 text-accent-soft text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Real-Time Voice Authenticity Engine
          </span>
          <h1 className="display text-3xl md:text-4xl text-text-primary">
            AI-Powered Voice Cloning Detection
          </h1>
          <p className="text-base text-text-secondary leading-relaxed max-w-xl">
            Multi-signal acoustic defense — a Wav2Vec2 deepfake classifier, prosody anomaly
            detection, speaker verification, and contextual risk scoring.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link to="/live-call" className="btn btn-accent btn-lg">
              <Radio className="w-4 h-4" /> Start Live Monitoring
            </Link>
            <Link to="/analyze" className="btn btn-ghost btn-lg">
              <FileAudio className="w-4 h-4" /> Analyze Audio
            </Link>
          </div>
        </div>
      </section>

      {/* Status & Policy Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Backend */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Backend Engine</span>
            <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Server className="w-4 h-4 text-accent-soft" />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-semibold ${online ? 'text-text-primary' : 'text-text-muted'}`}>
              {online ? 'Online' : 'Checking'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className={`inline-flex h-1.5 w-1.5 rounded-full ${online ? 'bg-risk-low' : 'bg-text-muted'}`} />
              FastAPI
            </span>
          </div>
          <div className="text-xs text-text-secondary space-y-1.5 pt-3 border-t border-glass/[0.06]">
            <div className="flex justify-between">
              <span>Database</span>
              <span className="font-mono text-risk-low">{health?.database || 'SQLite / Memory'}</span>
            </div>
            <div className="flex justify-between">
              <span>ML Inference</span>
              <span className="font-mono text-accent-soft">{health?.ml_service || 'Wav2Vec2 Ready'}</span>
            </div>
          </div>
        </div>

        {/* Active Policy */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Active Policy</span>
            <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-accent-soft" />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold capitalize text-text-primary">{org}</span>
            <span className="text-xs text-text-muted">Profile</span>
          </div>
          <div className="text-xs text-text-secondary space-y-1.5 pt-3 border-t border-glass/[0.06]">
            <div className="flex justify-between">
              <span>High-risk threshold</span>
              <span className="font-mono text-risk-medium">&gt; {orgPolicy.thresholds.high_min} / 100</span>
            </div>
            <div className="flex justify-between">
              <span>Critical action</span>
              <span className="text-primary max-w-[55%] truncate text-right">Freeze / Escalate</span>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Quick Actions</span>
            <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-accent-soft" />
            </span>
          </div>
          <div className="space-y-2">
            <Link to="/voiceprints" className="flex items-center justify-between p-3 rounded-2xl bg-glass/[0.04] hover:bg-glass/[0.08] text-sm transition-colors">
              <span className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-accent-soft" /> Voiceprint Enrollment
              </span>
              <ArrowRight className="w-4 h-4 text-text-muted" />
            </Link>
            <Link to="/alerts" className="flex items-center justify-between p-3 rounded-2xl bg-glass/[0.04] hover:bg-glass/[0.08] text-sm transition-colors">
              <span className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-accent-soft" /> Alert History
              </span>
              <ArrowRight className="w-4 h-4 text-text-muted" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
