/**
 * src/pages/Analyze.tsx
 * Audio file batch upload and deepfake analysis page.
 */
import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
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
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const res = await analyzeCall(file, org);
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
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Batch Audio Analysis</h1>
        <p className="text-xs text-text-secondary mt-1">
          Upload recorded WAV/MP3 clips to generate full explainability and risk breakdown.
        </p>
      </div>

      {!result && !loading && (
        <div className="card p-8 border-dashed border-2 border-bg-border hover:border-accent transition-colors flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-bg-surface flex items-center justify-center text-accent">
            <Upload className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-primary">Upload Call Audio Recording</h3>
            <p className="text-xs text-text-secondary max-w-sm">
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
            <div className="p-3 bg-bg-surface rounded-lg border border-bg-border flex items-center gap-3 w-full max-w-md">
              <FileAudio className="w-5 h-5 text-accent" />
              <div className="flex-1 text-left truncate">
                <span className="text-xs font-semibold text-text-primary block truncate">{file.name}</span>
                <span className="text-[10px] text-text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <button onClick={handleAnalyze} className="btn btn-primary btn-sm">
                Run Analysis
              </button>
            </div>
          ) : (
            <label htmlFor="audio-upload" className="btn btn-primary cursor-pointer">
              Select Audio File
            </label>
          )}
        </div>
      )}

      {loading && <LoadingState message="Running multi-signal ML inference & prosody extraction..." />}

      {error && <ErrorState message={error} onRetry={handleAnalyze} />}

      {result && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-bg-surface p-4 rounded-xl border border-bg-border">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <div>
                <span className="text-xs font-semibold text-text-primary block">Analysis Complete</span>
                <span className="text-[10px] text-text-muted font-mono">ID: {result.analysis_id}</span>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Analyze Another Clip
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6 flex flex-col items-center justify-center space-y-4">
              <RiskGauge score={result.risk_score} band={result.band} size={220} />
              <div className="text-center space-y-2 max-w-xs">
                <RiskBandBadge band={result.band} severity={result.severity} size="lg" />
                <p className="text-xs text-text-secondary">
                  {result.recommended_action || 'No additional threat escalation required.'}
                </p>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Extracted Authenticity Signals</h3>
              <SignalBreakdown signals={result.signals} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
