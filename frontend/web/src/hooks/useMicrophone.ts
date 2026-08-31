/**
 * src/hooks/useMicrophone.ts
 * Manages microphone permission and MediaRecorder lifecycle.
 * Audio chunks are passed to the onChunk callback as ArrayBuffer.
 * Raw audio is NEVER stored — chunks are sent immediately to the WebSocket.
 */
import { useCallback, useRef, useState } from 'react';

export type MicStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'stopped';

export interface UseMicrophoneOptions {
  chunkIntervalMs?: number;     // How often to slice audio chunks (default: 3000ms)
  onChunk: (chunk: ArrayBuffer) => void;
  onError?: (msg: string) => void;
}

export function useMicrophone(options: UseMicrophoneOptions) {
  const { chunkIntervalMs = 3000, onChunk, onError } = options;
  const [status, setStatus] = useState<MicStatus>('idle');
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

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

      // Prefer WAV-like format for backend compatibility
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
  }, [chunkIntervalMs, onChunk, onError]);

  const stop = useCallback(() => {
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

  return { status, start, stop };
}
