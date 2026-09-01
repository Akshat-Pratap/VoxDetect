/**
 * src/context/SignalSettingsContext.tsx
 * Global multi-signal fusion toggles (which signals vote in the verdict).
 * Persisted to localStorage so the demo choice survives reloads.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_FUSION, FusionMask } from '@/types';

interface SignalSettingsValue {
  fusion: FusionMask;
  setSignal: (key: keyof FusionMask, enabled: boolean) => void;
  anySecondaryEnabled: boolean;
}

const SignalSettingsContext = createContext<SignalSettingsValue>({
  fusion: DEFAULT_FUSION,
  setSignal: () => {},
  anySecondaryEnabled: false,
});

const STORAGE_KEY = 'voxdetect_signals';

export function SignalSettingsProvider({ children }: { children: React.ReactNode }) {
  const [fusion, setFusion] = useState<FusionMask>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_FUSION, ...parsed };
      }
    } catch {
      // ignore malformed storage
    }
    return { ...DEFAULT_FUSION };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fusion));
    } catch {
      // storage unavailable — ignore
    }
  }, [fusion]);

  const setSignal = (key: keyof FusionMask, enabled: boolean) => {
    setFusion((prev) => ({ ...prev, [key]: enabled }));
  };

  const anySecondaryEnabled =
    fusion.prosody_anomaly || fusion.voiceprint_risk || fusion.context_risk;

  return (
    <SignalSettingsContext.Provider value={{ fusion, setSignal, anySecondaryEnabled }}>
      {children}
    </SignalSettingsContext.Provider>
  );
}

export function useSignalSettings() {
  return useContext(SignalSettingsContext);
}
