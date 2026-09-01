/**
 * src/pages/Audit.tsx
 * Evidence log and privacy compliance audit trail.
 */
import React from 'react';
import { Alerts } from './Alerts';
import { ShieldCheck, Lock, EyeOff, FileText } from 'lucide-react';

export function Audit() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="display text-2xl text-text-primary">Audit & Evidence</h1>
        <p className="text-sm text-text-secondary mt-1">
          Privacy-safe compliance trail of every analysis.
        </p>
      </div>

      {/* Privacy Guarantee Card */}
      <div className="card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-accent/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-risk-low text-xs font-semibold uppercase tracking-wide">
            <Lock className="w-4 h-4" /> Privacy-Safe Cryptographic Audit
          </div>
          <h2 className="text-lg font-semibold text-text-primary">
            Zero Raw Audio Persistence Architecture
          </h2>
          <p className="text-sm text-text-secondary max-w-2xl">
            VoxDetect transiently extracts 256-d embeddings and prosody statistics in-memory. Evidence
            logs store risk scores, timestamps, and model signals only. No voice recordings ever touch the disk.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs font-mono bg-glass/[0.04] px-3 py-2 rounded-full border border-glass/[0.08] text-accent-soft shrink-0">
          <ShieldCheck className="w-4 h-4 text-risk-low" />
          <span>GDPR / DPDP Compliant</span>
        </div>
      </div>

      {/* Embed Alerts Table as Evidence Log */}
      <Alerts />
    </div>
  );
}
