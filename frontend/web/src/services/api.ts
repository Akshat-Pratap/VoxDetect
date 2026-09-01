/**
 * src/services/api.ts — Centralized API service layer.
 * All backend HTTP calls go through this module.
 * Base URL is read from VITE_API_URL environment variable.
 */
import axios, { AxiosError } from 'axios';
import type {
  AnalysisResponse,
  AlertListResponse,
  EnrollResponse,
  SpeakerProfile,
  HealthResponse,
  CallContext,
  OrgType,
  FusionMask,
} from '@/types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// ── Error normalizer ─────────────────────────────────────────────────
export interface ApiError {
  code: string;
  message: string;
  status: number;
}

function normalizeError(err: any): ApiError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const detail = err.response?.data?.detail;
    if (detail && typeof detail === 'object' && 'code' in detail) {
      return { code: detail.code, message: detail.message, status };
    }
    if (typeof detail === 'string') {
      return { code: 'API_ERROR', message: detail, status };
    }
    if (err.code === 'ECONNABORTED') {
      return { code: 'TIMEOUT', message: 'Request timed out.', status: 0 };
    }
    if (!err.response) {
      return { code: 'NETWORK_ERROR', message: 'Cannot connect to VoxDetect API.', status: 0 };
    }
    return { code: 'API_ERROR', message: err.message, status };
  }
  return { code: 'UNKNOWN_ERROR', message: err?.message || 'An unexpected error occurred.', status: 0 };
}

// ── Health ────────────────────────────────────────────────────────────
export async function getHealth(): Promise<HealthResponse> {
  try {
    const res = await apiClient.get<HealthResponse>('/v1/health');
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function getBasicHealth(): Promise<HealthResponse> {
  try {
    const res = await apiClient.get<HealthResponse>('/health');
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

// ── Analysis ──────────────────────────────────────────────────────────
export async function analyzeCall(
  audioFile: File,
  org: OrgType,
  context: Partial<CallContext> | null = null,
  fusion: Partial<Record<keyof FusionMask, boolean>> | null = null
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('org', org);
  if (context) {
    formData.append('context', JSON.stringify(context));
  }
  if (fusion) {
    formData.append('fusion', JSON.stringify(fusion));
  }
  try {
    const res = await apiClient.post<AnalysisResponse>('/v1/analyze-call', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // audio analysis can take longer
    });
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

// ── Alerts ────────────────────────────────────────────────────────────
export interface AlertsFilter {
  organization?: string;
  severity?: string;
  from_ts?: string;
  to_ts?: string;
  limit?: number;
  offset?: number;
}

export async function getAlerts(filter: AlertsFilter = {}): Promise<AlertListResponse> {
  try {
    const res = await apiClient.get<AlertListResponse>('/v1/alerts', { params: filter });
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

// ── Enrollment ────────────────────────────────────────────────────────
export async function enrollSpeaker(
  speakerId: string,
  name: string,
  audioFile: File
): Promise<EnrollResponse> {
  const formData = new FormData();
  formData.append('speaker_id', speakerId);
  formData.append('name', name);
  formData.append('file', audioFile);
  try {
    const res = await apiClient.post<EnrollResponse>('/v1/enroll', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function getSpeaker(speakerId: string): Promise<SpeakerProfile> {
  try {
    const res = await apiClient.get<SpeakerProfile>(`/v1/enroll/${speakerId}`);
    return res.data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function deleteSpeaker(speakerId: string): Promise<void> {
  try {
    await apiClient.delete(`/v1/enroll/${speakerId}`);
  } catch (err) {
    throw normalizeError(err);
  }
}
