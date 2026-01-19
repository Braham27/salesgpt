'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MessageSquare,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Settings,
  HelpCircle,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

interface SentimentData {
  sentiment: string;
  score: number;
  emotions: string[];
  engagement_level: string;
  timestamp: number;
}

interface CallContext {
  prospect_name?: string;
  prospect_company?: string;
  context?: string;
  objective?: string;
}

export default function CallInterface({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentSentiment, setCurrentSentiment] = useState<SentimentData | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  
  const [callContext, setCallContext] = useState<CallContext>({
    prospect_name: '',
    prospect_company: '',
    context: '',
    objective: '',
  });
  
  // Demo mode state
  const [demoMode, setDemoMode] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'salesperson' | 'prospect'>('salesperson');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const currentSpeakerRef = useRef<'salesperson' | 'prospect'>('salesperson');
  
  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    currentSpeakerRef.current = currentSpeaker;
  }, [currentSpeaker]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);
  
  // Timer for call duration
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive]);
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get WebSocket URL with fallback
  const getWsUrl = () => {
    // Use Railway backend URL
    const backendUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://salesgpt-production.up.railway.app';
    return `${backendUrl}/api/ws/call/${params.id}?token=demo`;
  };
  
  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    const wsUrl = getWsUrl();
    console.log('Connecting to WebSocket:', wsUrl);
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [params.id]);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'transcript':
        setTranscript((prev) => [...prev, data.data as TranscriptSegment]);
        break;
      case 'suggestion':
        setSuggestions((prev) => [data.data as Suggestion, ...prev].slice(0, 5));
        break;
      case 'sentiment':
        setCurrentSentiment(data.data as SentimentData);
        break;
      case 'consent':
        if (data.data.status === 'granted') {
          setConsentGranted(true);
        }
        break;
      case 'call_ended':
        handleCallEnded(data.data);
        break;
      case 'pong':
        // Heartbeat response
        break;
    }
  };
  
  // Start demo mode with Web Speech API
  const startDemoMode = async () => {
    try {
      // Check if Web Speech API is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
        return;
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Set up speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      // Track current interim transcript for display
      let currentInterimId = 0;
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }
        
        // Show interim results immediately (update or add)
        if (interimTranscript) {
          const interimSegment: TranscriptSegment = {
            text: interimTranscript,
            speaker: currentSpeakerRef.current,
            start_time: Date.now() / 1000,
            end_time: Date.now() / 1000,
            confidence: 0.5,
            is_final: false,
          };
          
          setTranscript(prev => {
            // Remove any previous interim (non-final) and add new one
            const withoutInterim = prev.filter(s => s.is_final);
            return [...withoutInterim, interimSegment];
          });
        }
        
        // Add final results
        if (finalTranscript) {
          const finalSegment: TranscriptSegment = {
            text: finalTranscript,
            speaker: currentSpeakerRef.current,
            start_time: Date.now() / 1000,
            end_time: Date.now() / 1000,
            confidence: 0.95,
            is_final: true,
          };
          
          setTranscript(prev => {
            // Remove interim and add final
            const withoutInterim = prev.filter(s => s.is_final);
            return [...withoutInterim, finalSegment];
          });
          
          // Get AI suggestion after each final transcript
          if (finalTranscript.length > 20) {
            getAISuggestion(finalTranscript);
          }
        }
      };
      
      recognition.onstart = () => {
        console.log('Speech recognition started - listening...');
        setIsListening(true);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        } else if (event.error === 'no-speech') {
          // No speech detected, this is normal - will restart
          console.log('No speech detected, waiting...');
        } else if (event.error === 'aborted') {
          console.log('Speech recognition aborted, will restart...');
        } else if (event.error === 'network') {
          alert('Network error with speech recognition. Please check your connection.');
        }
      };
      
      recognition.onend = () => {
        // Restart recognition - use ref to check if still active
        if (recognitionRef.current) {
          try {
            console.log('Speech recognition ended, restarting...');
            recognition.start();
          } catch (e) {
            console.log('Recognition restart error:', e);
          }
        }
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
      setDemoMode(true);
      setIsCallActive(true);
      setConsentGranted(true); // Auto-grant consent in demo mode
      
      console.log('Demo mode started with Web Speech API');
    } catch (error) {
      console.error('Failed to start demo mode:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };
  
  // Get AI suggestion from Railway backend
  const getAISuggestion = async (transcriptText: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://salesgpt-production.up.railway.app';
      const response = await fetch(`${backendUrl}/api/calls/test-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript_text: transcriptText,
          prospect_name: callContext.prospect_name || 'Prospect',
          prospect_company: callContext.prospect_company || 'Company',
          context: callContext.context,
          objective: callContext.objective || 'Have a productive sales conversation'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const suggestion = result.suggestion;
        const newSuggestion: Suggestion = {
          type: suggestion?.type || 'general',
          content: suggestion?.content || result.suggestion,
          context: 'AI Powered by GPT-4o',
          confidence: suggestion?.confidence || 0.9,
          priority: suggestion?.priority || 1
        };
        setSuggestions(prev => [newSuggestion, ...prev].slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      // Fallback to Vercel API route
      try {
        const response = await fetch('/api/ai-suggestion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: transcriptText,
            prospect_name: callContext.prospect_name,
            company_name: callContext.prospect_company,
            suggestion_type: 'general'
          })
        });
        if (response.ok) {
          const result = await response.json();
          setSuggestions(prev => [{
            type: result.type || 'general',
            content: result.suggestion,
            context: 'Demo Mode',
            confidence: 0.8,
            priority: 1
          }, ...prev].slice(0, 5));
        }
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    }
  };
  
  // Start call - always use Web Speech API for real transcription
  const startCall = async () => {
    try {
      // Always use demo mode with Web Speech API for real voice transcription
      // (Backend Deepgram streaming is not fully implemented)
      console.log('Starting call with Web Speech API transcription');
      await startDemoMode();
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };
  
  // Setup audio processing
  const setupAudioProcessing = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext({ sampleRate: 16000 });
    const source = audioContextRef.current.createMediaStreamSource(stream);
    processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processorRef.current.onaudioprocess = (event) => {
      if (!isMuted && consentGranted && wsRef.current?.readyState === WebSocket.OPEN) {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = convertFloat32ToInt16(inputData);
        wsRef.current.send(pcmData.buffer);
      }
    };
    
    source.connect(processorRef.current);
    processorRef.current.connect(audioContextRef.current.destination);
  };
  
  // Convert audio format
  const convertFloat32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  };
  
  // Handle consent
  const handleConsent = (granted: boolean) => {
    setShowConsentDialog(false);
    if (granted) {
      wsRef.current?.send(JSON.stringify({ type: 'consent_granted' }));
      setConsentGranted(true);
    } else {
      wsRef.current?.send(JSON.stringify({ type: 'consent_denied' }));
    }
  };
  
  // End call
  const endCall = () => {
    // Clean up WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
      wsRef.current.close();
    }
    
    // Clean up demo mode speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Clean up media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsCallActive(false);
    setDemoMode(false);
    setIsListening(false);
  };
  
  // Handle call ended
  const handleCallEnded = (data: any) => {
    console.log('Call ended:', data);
    router.push(`/calls/${params.id}/summary`);
  };
  
  // Request specific help - with Vercel API fallback
  const requestHelp = async (helpType: string, data?: any) => {
    // Try WebSocket first if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: helpType,
          data: data || {},
        })
      );
      return;
    }
    
    // Fallback to Vercel API route for AI suggestions
    try {
      const suggestionType = helpType === 'request_discovery' ? 'discovery' 
        : helpType === 'request_product' ? 'product'
        : helpType === 'request_closing' ? 'closing' 
        : 'general';
      
      const transcriptText = transcript.map(s => `${s.speaker}: ${s.text}`).join('\n') || 
        'Starting a new sales call...';
      
      const response = await fetch('/api/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          prospect_name: callContext.prospect_name,
          company_name: callContext.prospect_company,
          suggestion_type: suggestionType,
          context: callContext.context
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const newSuggestion: Suggestion = {
          type: suggestionType,
          content: result.suggestion,
          context: result.demo_mode ? 'Demo Mode' : 'AI Generated',
          confidence: 0.9,
          priority: 1
        };
        setSuggestions(prev => [newSuggestion, ...prev].slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
    }
  };
  
  // Copy suggestion
  const copySuggestion = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  // Provide feedback on suggestion
  const provideFeedback = (suggestion: Suggestion, wasHelpful: boolean) => {
    wsRef.current?.send(
      JSON.stringify({
        type: 'suggestion_feedback',
        data: {
          was_helpful: wasHelpful,
          was_used: wasHelpful,
        },
      })
    );
    // Remove from list
    setSuggestions((prev) => prev.filter((s) => s !== suggestion));
  };
  
  // Get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-500';
      case 'negative':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };
  
  // Get suggestion icon
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'objection_handler':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'product_pitch':
        return <Package className="w-5 h-5 text-purple-500" />;
      case 'question':
        return <HelpCircle className="w-5 h-5 text-blue-500" />;
      case 'closing':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isCallActive && (
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
              <span className="text-xl font-semibold">
                {callContext.prospect_name || 'Sales Call'}
              </span>
              {demoMode && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                  DEMO MODE
                </span>
              )}
            </div>
            {callContext.prospect_company && (
              <span className="text-slate-400">
                @ {callContext.prospect_company}
              </span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <span className="text-2xl font-mono">{formatDuration(callDuration)}</span>
            {currentSentiment && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Sentiment:</span>
                <span className={`font-medium ${getSentimentColor(currentSentiment.sentiment)}`}>
                  {currentSentiment.sentiment}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px-80px)] mb-20">
        {/* Left Panel - Transcript */}
        <div className="w-1/2 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Live Transcript
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length === 0 && !isCallActive && (
              <div className="text-center text-slate-500 py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Start a call to see the live transcript</p>
              </div>
            )}
            {transcript.length === 0 && isCallActive && demoMode && (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className={`w-4 h-4 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                </div>
                <p className="text-slate-400 mb-2">
                  {isListening ? '🎤 Listening... Speak into your microphone' : 'Starting speech recognition...'}
                </p>
                <p className="text-xs text-slate-500">
                  Make sure you\'re using Chrome or Edge browser<br/>
                  and microphone permission is granted
                </p>
              </div>
            )}
            {transcript.map((segment, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg ${
                  segment.speaker === 'salesperson'
                    ? 'bg-primary-900/30 border-l-4 border-primary-500 ml-8'
                    : 'bg-slate-800 border-l-4 border-slate-600 mr-8'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {segment.speaker === 'salesperson' ? 'You' : 'Prospect'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {segment.start_time.toFixed(1)}s
                  </span>
                </div>
                <p className={segment.is_final ? 'text-white' : 'text-slate-400 italic'}>
                  {segment.text}
                </p>
              </motion.div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* Right Panel - AI Suggestions */}
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              AI Suggestions
            </h2>
          </div>
          
          {/* Quick Actions */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => requestHelp('request_discovery')}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                Discovery Questions
              </button>
              <button
                onClick={() => requestHelp('request_product', { needs: 'general', pain_points: [] })}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-1"
              >
                <Package className="w-4 h-4" />
                Product Suggestion
              </button>
              <button
                onClick={() => requestHelp('request_closing')}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                Closing Help
              </button>
            </div>
          </div>
          
          {/* Suggestions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          {suggestion.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-white mb-3">{suggestion.content}</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copySuggestion(suggestion.content)}
                          className="p-1.5 hover:bg-slate-700 rounded"
                          title="Copy"
                        >
                          <Copy className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => provideFeedback(suggestion, true)}
                          className="p-1.5 hover:bg-slate-700 rounded"
                          title="Helpful"
                        >
                          <ThumbsUp className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => provideFeedback(suggestion, false)}
                          className="p-1.5 hover:bg-slate-700 rounded"
                          title="Not helpful"
                        >
                          <ThumbsDown className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {suggestions.length === 0 && (
              <div className="text-center text-slate-500 py-12">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>AI suggestions will appear here during the call</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-center justify-center gap-4">
          {!isCallActive ? (
            <>
              {/* Pre-call context inputs */}
              <input
                type="text"
                placeholder="Prospect Name"
                value={callContext.prospect_name}
                onChange={(e) =>
                  setCallContext((prev) => ({ ...prev, prospect_name: e.target.value }))
                }
                className="px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-primary-500 outline-none"
              />
              <input
                type="text"
                placeholder="Company"
                value={callContext.prospect_company}
                onChange={(e) =>
                  setCallContext((prev) => ({ ...prev, prospect_company: e.target.value }))
                }
                className="px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-primary-500 outline-none"
              />
              <input
                type="text"
                placeholder="Call Objective"
                value={callContext.objective}
                onChange={(e) =>
                  setCallContext((prev) => ({ ...prev, objective: e.target.value }))
                }
                className="px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-primary-500 outline-none w-64"
              />
              <button
                onClick={startCall}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full flex items-center gap-2 font-semibold"
              >
                <Phone className="w-5 h-5" />
                Start Call
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full ${
                  isMuted ? 'bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              {/* Speaker Toggle - Demo Mode Only */}
              {demoMode && (
                <button
                  onClick={() => setCurrentSpeaker(prev => prev === 'salesperson' ? 'prospect' : 'salesperson')}
                  className={`px-4 py-3 rounded-full flex items-center gap-2 font-medium transition-all ${
                    currentSpeaker === 'salesperson' 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                  title="Toggle speaker (You / Prospect)"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm">
                    {currentSpeaker === 'salesperson' ? 'You' : 'Prospect'}
                  </span>
                </button>
              )}
              
              <button
                onClick={endCall}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-full flex items-center gap-2 font-semibold"
              >
                <PhoneOff className="w-5 h-5" />
                End Call
              </button>
              <button className="p-4 rounded-full bg-slate-700 hover:bg-slate-600">
                <Settings className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Consent Dialog */}
      {showConsentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-800 rounded-xl p-6 max-w-md mx-4"
          >
            <h3 className="text-xl font-semibold mb-4">Recording Consent Required</h3>
            <p className="text-slate-300 mb-6">
              This call will be recorded and transcribed to provide AI assistance.
              Please ask the prospect for their consent to record this call.
            </p>
            <div className="bg-slate-700 rounded-lg p-4 mb-6">
              <p className="text-sm italic text-slate-300">
                "Before we continue, I want to let you know that I have an assistant
                tool that helps me during our call, which involves recording and
                transcribing our conversation. Do I have your permission to proceed?"
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleConsent(true)}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
              >
                Consent Granted
              </button>
              <button
                onClick={() => handleConsent(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold"
              >
                No Consent
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
