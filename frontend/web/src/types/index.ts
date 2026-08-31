/**
 * src/types/index.ts — All TypeScript interfaces matching the actual backend contracts.
 */

// ── Organization ─────────────────────────────────────────────────────
export type OrgType = 'bank' | 'enterprise' | 'government';

export interface OrgThresholds {
  low_max: number;
  medium_max: number;
  high_min: number;
  critical_min: number;
}

export interface OrgActions {
  low: string;
  medium: string;
  high: string;
  critical: string;
}

export interface OrgConfig {
  organization: OrgType;
  thresholds: OrgThresholds;
  actions: OrgActions;
}

// Hardcoded from backend config JSON — used for local policy display only
export const ORG_CONFIGS: Record<OrgType, OrgConfig> = {
  bank: {
    organization: 'bank',
    thresholds: { low_max: 25, medium_max: 60, high_min: 60, critical_min: 85 },
    actions: {
      low: 'No action required. Transaction may proceed.',
      medium: 'Request secondary authentication before authorising transaction.',
      high: 'Perform independent callback to registered number and verify identity.',
      critical: 'Freeze sensitive transaction. Perform MFA and independent callback immediately.',
    },
  },
  enterprise: {
    organization: 'enterprise',
    thresholds: { low_max: 30, medium_max: 70, high_min: 70, critical_min: 90 },
    actions: {
      low: 'No action required. Continue normally.',
      medium: 'Apply additional identity verification before proceeding.',
      high: 'Perform independent callback and secondary verification.',
      critical: 'Halt sensitive operation. Perform MFA and independent callback.',
    },
  },
  government: {
    organization: 'government',
    thresholds: { low_max: 20, medium_max: 55, high_min: 55, critical_min: 80 },
    actions: {
      low: 'No action required. Continue processing.',
      medium: 'Initiate secondary biometric or document verification.',
      high: 'Escalate to supervisor. Perform voice + identity re-verification via secure channel.',
      critical: 'Immediately suspend session. Alert security team. Do not share any sensitive data.',
    },
  },
};

// ── Risk ─────────────────────────────────────────────────────────────
export type RiskBand = 'low' | 'medium' | 'high' | 'critical';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface SignalBreakdownData {
  model: number | null;
  prosody_anomaly: number | null;
  voiceprint_risk: number | null;
  context_risk: number | null;
}

// ── Call Context ─────────────────────────────────────────────────────
export interface CallContext {
  first_time_contact: boolean;
  high_value: boolean;
  odd_hour: boolean;
  sensitive_data_request: boolean;
  enrolled_speaker_id: string | null;
}

// ── Analysis ─────────────────────────────────────────────────────────
export interface ModelsData {
  synthetic_prob: number | null;
}

export interface AnalysisResponse {
  analysis_id: string;
  risk_score: number | null;
  band: string | null;
  confidence: number | null;
  models: ModelsData;
  signals: SignalBreakdownData;
  organization: string | null;
  flagged: boolean;
  severity: string | null;
  recommended_action: string | null;
  timestamp: string;
  evidence_id: string | null;
  processing_latency_ms: number | null;
}

// ── WebSocket Streaming ──────────────────────────────────────────────
export interface StreamMetadata {
  org: OrgType;
  first_time_contact: boolean;
  high_value: boolean;
  odd_hour: boolean;
  sensitive_data_request: boolean;
  enrolled_speaker_id: string | null;
}

export interface StreamReadyMessage {
  type: 'ready';
  connection_id: string;
}

export interface StreamChunkResult {
  type: 'risk_update';
  timestamp: string;
  chunk_index: number;
  risk_score: number | null;
  rolling_risk_score: number | null;
  band: string | null;
  confidence: number | null;
  signals: Record<string, number>;
  flagged: boolean;
  severity: string | null;
  recommended_action: string | null;
}

export interface StreamErrorResult {
  type: 'error';
  timestamp: string;
  message: string;
  code: string;
}

export type StreamMessage = StreamReadyMessage | StreamChunkResult | StreamErrorResult;

// ── Alert ────────────────────────────────────────────────────────────
export interface AlertRecord {
  analysis_id: string;
  organization: string | null;
  risk_score: number | null;
  risk_band: string | null;
  flagged: boolean;
  severity: string | null;
  recommended_action: string | null;
  processing_latency_ms: number | null;
  created_at: string;
}

export interface AlertListResponse {
  items: AlertRecord[];
  total: number;
  limit: number;
  offset: number;
}

// ── Enrollment ───────────────────────────────────────────────────────
export interface EnrollResponse {
  speaker_id: string;
  display_name: string;
  enrolled: boolean;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface SpeakerProfile {
  speaker_id: string;
  display_name: string;
  enrolled: boolean;
  created_at: string;
  updated_at: string;
}

// ── Health ───────────────────────────────────────────────────────────
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database?: string | null;
  ml_service?: string | null;
}

// ── UI State ─────────────────────────────────────────────────────────
export type WSStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'monitoring'
  | 'reconnecting'
  | 'stopping'
  | 'error';

export interface RiskHistoryPoint {
  time: number;
  score: number;
  rolling: number;
}

// ── Toasts ───────────────────────────────────────────────────────────
export interface ToastAlert {
  id: string;
  type: 'high_risk' | 'critical_risk' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  score?: number;
  band?: string;
  action?: string;
  timestamp: number;
  autoClose?: boolean;
}
