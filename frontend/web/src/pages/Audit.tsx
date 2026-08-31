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
      {/* Privacy Guarantee Card */}
      <div className="card p-6 bg-gradient-to-r from-bg-surface to-bg-card border border-accent/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase tracking-wider">
            <Lock className="w-4 h-4" /> Privacy-Safe Cryptographic Audit
          </div>
          <h2 className="text-base font-bold text-text-primary">
            Zero Raw Audio Persistence Architecture
          </h2>
          <p className="text-xs text-text-secondary max-w-2xl">
            VoxDetect transiently extracts 256-d embeddings and prosody statistics in-memory. Evidence
            logs store risk scores, timestamps, and model signals only. No voice recordings ever touch the disk.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-bg-surface px-3 py-2 rounded-lg border border-bg-border text-accent">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span>GDPR / DPDP Compliant</span>
        </div>
      </div>

      {/* Embed Alerts Table as Evidence Log */}
      <Alerts />
    </div>
  );
}
