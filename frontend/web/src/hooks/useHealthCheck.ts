/**
 * src/hooks/useHealthCheck.ts
 * Polls /v1/health to maintain system status.
 * While offline, polls aggressively (every 3s) so the status flips to
 * "online" as soon as the backend becomes reachable — no restart needed.
 * When healthy, relaxes to the normal interval.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getHealth, getBasicHealth } from '@/services/api';
import type { HealthResponse } from '@/types';

export interface HealthState {
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;
  lastChecked: number | null;
}

export function useHealthCheck(intervalMs = 30000) {
  const [state, setState] = useState<HealthState>({
    health: null,
    loading: true,
    error: null,
    lastChecked: null,
  });
  const healthyRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    try {
      // Try extended health first, fall back to basic
      let data: HealthResponse;
      try {
        data = await getHealth();
      } catch {
        data = await getBasicHealth();
      }
      const wasOffline = !healthyRef.current;
      healthyRef.current = true;
      setState({ health: data, loading: false, error: null, lastChecked: Date.now() });
      // Back online after being offline — flip reflected immediately and
      // relax back to the slower poll rate.
      if (wasOffline) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(check, intervalMs);
        }
      }
    } catch {
      const wasOnline = healthyRef.current;
      healthyRef.current = false;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'VoxDetect API is offline.',
        lastChecked: Date.now(),
      }));
      // Just went offline — switch to fast retry so we recover instantly.
      if (wasOnline) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(check, 3000);
        }
      }
    }
  }, [intervalMs]);

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check, intervalMs]);

  return { ...state, refresh: check };
}