import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranscriptStore, useCallStore } from './store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface TranscriptSegment {
  text: string;
  speaker: 'salesperson' | 'prospect' | 'unknown';
  start_time: number;
  end_time: number;
  confidence: number;
  is_final: boolean;
}

interface Suggestion {
  type: string;
  content: string;
  context: string;
  confidence: number;
  priority: number;
  alternative?: string;
}

interface WebSocketMessage {
  type: 'transcript' | 'suggestion' | 'consent_update' | 'call_end' | 'error' | 'connected';
  data?: unknown;
}

export function useCallWebSocket(callId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addSegment, addSuggestion, clearTranscript } = useTranscriptStore();
  const { setCallActive, setConsentGranted, resetCall } = useCallStore();

  const connect = useCallback(() => {
    if (!callId) return;

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Authentication required');
      return;
    }

    const ws = new WebSocket(`${WS_URL}/api/ws/call/${callId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'connected':
            console.log('Call session established');
            break;

          case 'transcript':
            const segment = message.data as TranscriptSegment;
            addSegment(segment);
            break;

          case 'suggestion':
            const suggestion = message.data as Suggestion;
            addSuggestion(suggestion);
            break;

          case 'consent_update':
            const { granted } = message.data as { granted: boolean };
            setConsentGranted(granted);
            break;

          case 'call_end':
            setCallActive(false);
            break;

          case 'error':
            setError(message.data as string);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Connection error');
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };
  }, [callId, addSegment, addSuggestion, setCallActive, setConsentGranted]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopAudioCapture();
    setIsConnected(false);
  }, []);

  const startAudioCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Data = convertFloat32ToInt16(inputData);
          wsRef.current.send(int16Data.buffer);
        }
      };

      setCallActive(true);
      return true;
    } catch (err) {
      console.error('Failed to start audio capture:', err);
      setError('Microphone access denied');
      return false;
    }
  }, [setCallActive]);

  const stopAudioCapture = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((type: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const grantConsent = useCallback(() => {
    sendMessage('consent_granted', { granted: true });
    setConsentGranted(true);
  }, [sendMessage, setConsentGranted]);

  const revokeConsent = useCallback(() => {
    sendMessage('consent_revoked', { granted: false });
    setConsentGranted(false);
  }, [sendMessage, setConsentGranted]);

  const endCall = useCallback(() => {
    sendMessage('end_call');
    stopAudioCapture();
    disconnect();
    resetCall();
    clearTranscript();
  }, [sendMessage, stopAudioCapture, disconnect, resetCall, clearTranscript]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    startAudioCapture,
    stopAudioCapture,
    grantConsent,
    revokeConsent,
    endCall,
    sendMessage,
  };
}

function convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

export function useCallTimer() {
  const { callDuration, incrementDuration, isCallActive } = useCallStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isCallActive) {
      intervalRef.current = setInterval(() => {
        incrementDuration();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCallActive, incrementDuration]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    duration: callDuration,
    formattedDuration: formatDuration(callDuration),
  };
}
