/**
 * src/pages/Analyze.tsx
 * Audio file batch upload and deepfake analysis page.
 */
import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useAlertContext } from '@/context/AlertContext';
import { useSignalSettings } from '@/context/SignalSettingsContext';
import { analyzeCall } from '@/services/api';
import { RiskGauge } from '@/components/risk/RiskGauge';
import { SignalBreakdown } from '@/components/risk/SignalBreakdown';
import { RiskBandBadge } from '@/components/risk/RiskBandBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import type { AnalysisResponse } from '@/types';
import { Upload, FileAudio, CheckCircle2, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

export function Analyze() {
  const { org } = useOrganization();
  const { addToast } = useAlertContext();
  const { fusion } = useSignalSettings();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result && (result.band === 'high' || result.band === 'critical')) {
      addToast({
        type: result.band === 'critical' ? 'critical_risk' : 'high_risk',
        title: result.band === 'critical' ? '🔴 CRITICAL RISK DETECTED' : '⚠ HIGH RISK DETECTED',
        message: `Risk score: ${Math.round(result.risk_score ?? 0)}/100. ${result.recommended_action ? '' : 'Potential voice-cloning detected.'}`,
        score: Math.round(result.risk_score ?? 0),
        band: result.band ?? undefined,
        action: result.recommended_action ?? undefined,
      });
    }
  }, [result, addToast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeCall(file, org, null, fusion);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to analyze audio clip.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="space-y-1">
        <h1 className="display text-2xl text-text-primary">Analyze Audio</h1>
        <p className="text-sm text-text-secondary">
          Upload a voice clip to detect whether it is a real human or a cloned voice.
        </p>
      </div>

      {!result && !loading && (
        <div className="card p-10 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Upload className="w-7 h-7 text-accent-soft" />
          </div>

          <div className="relative space-y-1.5">
            <h3 className="text-lg font-semibold text-text-primary">Upload Call Audio Recording</h3>
            <p className="text-sm text-text-secondary max-w-sm">
              Supports WAV, MP3, FLAC, OGG up to 25MB. Audio is analyzed in memory and immediately discarded.
            </p>
          </div>

          <input
            type="file"
            id="audio-upload"
            accept="audio/*,.wav,.mp3,.flac,.ogg"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="relative p-3 rounded-2xl bg-glass/[0.05] border border-glass/10 flex items-center gap-3 w-full max-w-md">
              <FileAudio className="w-5 h-5 text-accent-soft" />
              <div className="flex-1 text-left truncate">
                <span className="text-sm font-medium text-text-primary block truncate">{file.name}</span>
                <span className="text-xs text-text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <button onClick={handleAnalyze} className="btn btn-accent btn-sm">
                Run Analysis
              </button>
            </div>
          ) : (
            <label htmlFor="audio-upload" className="relative btn btn-accent cursor-pointer">
              Select Audio File
            </label>
          )}
        </div>
      )}

      {loading && <LoadingState message="Running multi-signal ML inference & prosody extraction..." />}

      {error && <ErrorState message={error} onRetry={handleAnalyze} />}

      {result && (
        <div className="space-y-6">
          <div className="flex justify-between items-center glass p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-risk-low/10 border border-risk-low/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-risk-low" />
              </span>
              <div>
                <span className="text-sm font-medium text-text-primary block">Analysis Complete</span>
                <span className="text-xs text-text-muted font-mono">ID: {result.analysis_id}</span>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Analyze Another
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-8 flex flex-col items-center justify-center space-y-5">
              <div className="relative">
                <RiskGauge score={result.risk_score} band={result.band} size={220} />
              </div>
              <div className="relative text-center space-y-2.5 max-w-xs">
                <RiskBandBadge band={result.band} severity={result.severity} size="lg" />
                <p className="text-sm text-text-secondary">
                  {result.recommended_action || 'No additional threat escalation required.'}
                </p>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-text-primary">Authenticity Signals</h3>
                <p className="text-xs text-text-muted mt-0.5">Four detectors, one verdict.</p>
              </div>
              <SignalBreakdown signals={result.signals} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
