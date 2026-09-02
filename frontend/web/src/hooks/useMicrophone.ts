/**
 * src/hooks/useMicrophone.ts
 * Manages microphone permission and MediaRecorder lifecycle.
 * Also exposes a real-time audio level (0-1) via AnalyserNode for live viz.
 * Raw audio is NEVER stored — chunks are sent immediately to the WebSocket.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type MicStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'stopped';

export interface UseMicrophoneOptions {
  chunkIntervalMs?: number;
  onChunk: (chunk: ArrayBuffer) => void;
  onError?: (msg: string) => void;
}

export function useMicrophone(options: UseMicrophoneOptions) {
  const { chunkIntervalMs = 3000, onChunk, onError } = options;
  const [status, setStatus] = useState<MicStatus>('idle');
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);

  const pollLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setLevel(Math.min(1, rms * 2.5));
    rafRef.current = requestAnimationFrame(pollLevel);
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      onError?.('Microphone not supported in this browser.');
      return;
    }

    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // Set up analyser for visualisation
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      rafRef.current = requestAnimationFrame(pollLevel);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const buffer = await event.data.arrayBuffer();
          onChunk(buffer);
        }
      };

      recorder.start(chunkIntervalMs);
      setStatus('active');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setStatus('denied');
        onError?.('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        setStatus('unavailable');
        onError?.('Microphone not available.');
      }
    }
  }, [chunkIntervalMs, onChunk, onError, pollLevel]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    analyserRef.current = null;
    setLevel(0);

    if (recorderRef.current) {
      if (recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStatus('stopped');
  }, []);

  return { status, start, stop, level };
}