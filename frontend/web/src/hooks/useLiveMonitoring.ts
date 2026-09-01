/**
 * src/hooks/useLiveMonitoring.ts
 * Orchestrates the full live monitoring session:
 * microphone → WebSocket → risk updates → alerts.
 *
 * State machine: IDLE → CONNECTING → CONNECTED → MONITORING → STOPPING → IDLE
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { VoxDetectWebSocket } from '@/services/websocket';
import { useMicrophone } from './useMicrophone';
import { useAlertContext } from '@/context/AlertContext';
import { useSignalSettings } from '@/context/SignalSettingsContext';
import type {
  OrgType,
  WSStatus,
  StreamChunkResult,
  RiskHistoryPoint,
  CallContext,
  SignalBreakdownData,
  FusionMask,
} from '@/types';

const MAX_HISTORY = 60;  // Keep at most 60 score points in memory

export interface LiveMonitoringState {
  wsStatus: WSStatus;
  connectionId: string | null;
  riskScore: number | null;
  rollingRisk: number | null;
  band: string | null;
  severity: string | null;
  flagged: boolean;
  recommendedAction: string | null;
  signals: SignalBreakdownData;
  history: RiskHistoryPoint[];
  chunkCount: number;
  wsError: string | null;
  micStatus: import('./useMicrophone').MicStatus;
}

export function useLiveMonitoring(org: OrgType, context: Partial<CallContext>) {
  const { addToast } = useAlertContext();
  const { fusion } = useSignalSettings();

  const [state, setState] = useState<LiveMonitoringState>({
    wsStatus: 'idle',
    connectionId: null,
    riskScore: null,
    rollingRisk: null,
    band: null,
    severity: null,
    flagged: false,
    recommendedAction: null,
    signals: { model: null, prosody_anomaly: null, voiceprint_risk: null, context_risk: null },
    history: [],
    chunkCount: 0,
    wsError: null,
    micStatus: 'idle',
  });

  const wsRef = useRef<VoxDetectWebSocket | null>(null);
  const prevBandRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMonitoringRef = useRef(false);
  const orgRef = useRef(org);
  const contextRef = useRef(context);
  const fusionRef = useRef(fusion);

  // Keep refs in sync so reconnect picks up latest values
  useEffect(() => { orgRef.current = org; }, [org]);
  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { fusionRef.current = fusion; }, [fusion]);

  const handleChunk = useCallback((chunk: ArrayBuffer) => {
    wsRef.current?.sendAudioChunk(chunk);
  }, []);

  const { status: micStatus, start: startMic, stop: stopMic } = useMicrophone({
    chunkIntervalMs: 3000,
    onChunk: handleChunk,
    onError: (msg) => {
      setState((prev) => ({ ...prev, wsError: msg, wsStatus: 'error' }));
      addToast({ type: 'error', title: 'Microphone Error', message: msg });
    },
  });

  // Keep micStatus in state for UI
  useEffect(() => {
    setState((prev) => ({ ...prev, micStatus }));
  }, [micStatus]);

  const handleRiskUpdate = useCallback(
    (data: StreamChunkResult) => {
      const score = data.risk_score ?? data.rolling_risk_score;

      setState((prev) => {
        const newHistory = [
          ...prev.history,
          {
            time: Date.now(),
            score: data.risk_score ?? 0,
            rolling: data.rolling_risk_score ?? data.risk_score ?? 0,
          },
        ].slice(-MAX_HISTORY);

        return {
          ...prev,
          riskScore: data.risk_score,
          rollingRisk: data.rolling_risk_score,
          band: data.band,
          severity: data.severity,
          flagged: data.flagged,
          recommendedAction: data.recommended_action,
          signals: {
            model: (data.signals?.model as number | null) ?? null,
            prosody_anomaly: (data.signals?.prosody_anomaly as number | null) ?? null,
            voiceprint_risk: (data.signals?.voiceprint_risk as number | null) ?? null,
            context_risk: (data.signals?.context_risk as number | null) ?? null,
          },
          history: newHistory,
          chunkCount: prev.chunkCount + 1,
        };
      });

      // Trigger alert on band escalation
      const currentBand = data.band;
      const prevBand = prevBandRef.current;
      const escalated =
        (currentBand === 'high' && prevBand !== 'high' && prevBand !== 'critical') ||
        (currentBand === 'critical' && prevBand !== 'critical');

      if (escalated && data.flagged) {
        const isCritical = currentBand === 'critical';
        addToast({
          type: isCritical ? 'critical_risk' : 'high_risk',
          title: isCritical ? '🔴 CRITICAL RISK DETECTED' : '⚠ HIGH RISK DETECTED',
          message: `Risk score: ${Math.round(score ?? 0)}/100. ${
            data.recommended_action ? '' : 'Potential voice-cloning detected.'
          }`,
          score: Math.round(score ?? 0),
          band: currentBand ?? undefined,
          action: data.recommended_action ?? undefined,
        });
      }

      prevBandRef.current = currentBand;
    },
    [addToast]
  );

  const connectWS = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new VoxDetectWebSocket({
      onConnecting: () => setState((prev) => ({ ...prev, wsStatus: 'connecting', wsError: null })),
      onReady: (id) => {
        setState((prev) => ({
          ...prev,
          wsStatus: 'monitoring',
          connectionId: id,
          wsError: null,
        }));
      },
      onRiskUpdate: handleRiskUpdate,
      onError: (code, msg) => {
        if (code !== 'CHUNK_TOO_LARGE' && code !== 'EMPTY_CHUNK') {
          setState((prev) => ({ ...prev, wsError: msg }));
        }
      },
      onClose: (clean) => {
        if (isMonitoringRef.current) {
          setState((prev) => ({ ...prev, wsStatus: 'reconnecting', wsError: null }));
          // Reconnect after 3 seconds
          reconnectTimerRef.current = setTimeout(() => {
            if (isMonitoringRef.current) {
              connectWS();
            }
          }, 3000);
        } else {
          setState((prev) => ({ ...prev, wsStatus: 'idle' }));
        }
      },
    });

    ws.connect({
      org: orgRef.current,
      first_time_contact: contextRef.current.first_time_contact ?? false,
      high_value: contextRef.current.high_value ?? false,
      odd_hour: contextRef.current.odd_hour ?? false,
      sensitive_data_request: contextRef.current.sensitive_data_request ?? false,
      enrolled_speaker_id: contextRef.current.enrolled_speaker_id ?? null,
      fusion: fusionRef.current,
    });

    wsRef.current = ws;
  }, [handleRiskUpdate]);

  const startMonitoring = useCallback(async () => {
    isMonitoringRef.current = true;
    prevBandRef.current = null;
    setState((prev) => ({
      ...prev,
      wsStatus: 'connecting',
      history: [],
      chunkCount: 0,
      wsError: null,
      riskScore: null,
      rollingRisk: null,
      band: null,
      severity: null,
      flagged: false,
      recommendedAction: null,
      signals: { model: null, prosody_anomaly: null, voiceprint_risk: null, context_risk: null },
    }));

    connectWS();
    await startMic();
  }, [connectWS, startMic]);

  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    stopMic();
    wsRef.current?.close();
    wsRef.current = null;
    setState((prev) => ({ ...prev, wsStatus: 'idle', connectionId: null }));
  }, [stopMic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMonitoringRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      stopMic();
      wsRef.current?.close();
    };
  }, [stopMic]);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    isMonitoring: isMonitoringRef.current,
  };
}
