/**
 * src/pages/Audit.tsx — Evidence log and privacy compliance trail
 */
import React from 'react';
import { Alerts } from './Alerts';
import { ShieldCheck, Lock } from 'lucide-react';

export function Audit() {
  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Audit & Evidence</h1>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Privacy-safe compliance trail of every analysis
        </p>
      </div>

      <div className="card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-l-2 border-l-[rgb(var(--accent))]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--risk-low))]">
            <Lock className="w-3.5 h-3.5" /> Zero Raw Audio Persistence
          </div>
          <p className="text-xs text-[rgb(var(--text-secondary))] max-w-2xl">
            Only risk scores, timestamps, and model signals are stored. No voice recordings ever touch disk.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] text-[rgb(var(--accent-soft))] shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[rgb(var(--risk-low))]" />
          GDPR / DPDP Compliant
        </div>
      </div>

      <Alerts />
    </div>
  );
}