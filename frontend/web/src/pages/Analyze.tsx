/**
 * src/pages/Analyze.tsx — Audio file upload and deepfake analysis
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
import { FileAudio, CheckCircle2, RotateCcw } from 'lucide-react';
import { UploadDoneIcon } from '@/components/ui/AnimatedIcons';

export function Analyze() {
  const { org } = useOrganization();
  const { addToast } = useAlertContext();
  const { fusion } = useSignalSettings();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (result) {
      if (result.band === 'high' || result.band === 'critical') {
        addToast({
          type: result.band === 'critical' ? 'critical_risk' : 'high_risk',
          title: result.band === 'critical' ? 'CRITICAL RISK' : 'HIGH RISK',
          message: `Score: ${Math.round(result.risk_score ?? 0)}/100`,
          score: Math.round(result.risk_score ?? 0),
          band: result.band ?? undefined,
          action: result.recommended_action ?? undefined,
        });
      } else {
        addToast({
          type: 'info',
          title: 'Analysis complete',
          message: `${result.band?.toUpperCase() ?? 'NA'} risk — score ${Math.round(result.risk_score ?? 0)}/100`,
          score: Math.round(result.risk_score ?? 0),
          band: result.band ?? undefined,
        });
      }
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
      setError(err?.message || 'Analysis failed.');
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
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-[rgb(var(--text-primary))]">Analyze Audio</h1>
        <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">
          Upload a voice clip to detect real vs. cloned speech
        </p>
      </div>

      {!result && !loading && (
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[rgb(var(--accent))] text-white flex items-center justify-center mb-5 shadow-md">
            <UploadDoneIcon size={24} color="#fff" />
          </div>

          <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-1">
            Upload Call Recording
          </h3>
          <p className="text-xs text-[rgb(var(--text-muted))] max-w-xs mb-6">
            WAV, MP3, FLAC, OGG up to 25MB. Audio is analyzed in memory and discarded.
          </p>

          <input
            type="file"
            id="audio-upload"
            accept="audio/*,.wav,.mp3,.flac,.ogg"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="p-2.5 rounded-md bg-[var(--hover-bg)] border border-[rgb(var(--border-subtle))] flex items-center gap-3 w-full max-w-sm">
              <FileAudio className="w-4 h-4 text-[rgb(var(--accent-soft))] shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-[rgb(var(--text-primary))] block truncate">{file.name}</span>
                <span className="text-[10px] font-mono text-[rgb(var(--text-muted))]">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              <button onClick={handleAnalyze} className="btn btn-primary btn-sm shrink-0">
                Analyze
              </button>
            </div>
          ) : (
            <label htmlFor="audio-upload" className="btn btn-primary cursor-pointer mt-1">
              <UploadDoneIcon size={16} /> Select File
            </label>
          )}
        </div>
      )}

      {loading && <LoadingState message="Running inference..." />}

      {error && <ErrorState message={error} onRetry={handleAnalyze} />}

      {result && (
        <div className="space-y-4">
          <div className="card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[rgb(var(--accent))]" />
              <div>
                <span className="text-xs font-medium text-[rgb(var(--text-primary))]">Analysis Complete</span>
                <span className="text-[10px] font-mono text-[rgb(var(--text-muted))] ml-2">{result.analysis_id}</span>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm">
              <RotateCcw className="w-3 h-3" /> New
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card flex flex-col items-center py-6">
              <RiskGauge score={result.risk_score} band={result.band} size={200} />
              <div className="mt-3 text-center">
                <RiskBandBadge band={result.band} severity={result.severity} size="lg" />
                <p className="text-[11px] text-[rgb(var(--text-muted))] mt-2 max-w-xs">
                  {result.recommended_action || 'No escalation required'}
                </p>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">
                Signal Breakdown
              </h3>
              <SignalBreakdown signals={result.signals} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
