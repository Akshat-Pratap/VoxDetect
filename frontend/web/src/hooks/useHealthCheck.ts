/**
 * src/hooks/useHealthCheck.ts
 * Polls /v1/health every 30 seconds to maintain system status.
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
      setState({ health: data, loading: false, error: null, lastChecked: Date.now() });
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'VoxDetect API is offline.',
        lastChecked: Date.now(),
      }));
    }
  }, []);

  useEffect(() => {
    check();
    intervalRef.current = setInterval(check, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check, intervalMs]);

  return { ...state, refresh: check };
}
