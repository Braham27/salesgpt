import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallStore, useTranscriptStore } from '../store/authStore';
import * as SecureStore from 'expo-secure-store';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000';

export default function LiveCallScreen({ route, navigation }: any) {
  const { callId, prospect } = route.params;
  const [isConnected, setIsConnected] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {
    isCallActive,
    isMuted,
    callDuration,
    setCallActive,
    setMuted,
    setConsentGranted,
    incrementDuration,
    resetCall,
  } = useCallStore();

  const { segments, suggestions, addSegment, addSuggestion, clearTranscript } = useTranscriptStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        incrementDuration();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  useEffect(() => {
    if (isCallActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isCallActive]);

  const connectWebSocket = async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    const ws = new WebSocket(`${WS_URL}/api/ws/call/${callId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'transcript':
            addSegment(message.data);
            break;
          case 'suggestion':
            addSuggestion(message.data);
            break;
          case 'call_end':
            setCallActive(false);
            break;
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setCallActive(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    setCallActive(false);
  };

  const handleConsentGrant = async () => {
    setShowConsentDialog(false);
    setConsentGranted(true);
    await connectWebSocket();
    await startRecording();
  };

  const handleConsentDeny = () => {
    setShowConsentDialog(false);
    navigation.goBack();
  };

  const handleEndCall = async () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            await stopRecording();
            wsRef.current?.close();
            resetCall();
            clearTranscript();
            navigation.navigate('CallSummary', { callId });
          },
        },
      ]
    );
  };

  const toggleMute = () => {
    setMuted(!isMuted);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (showConsentDialog) {
    return (
      <View style={styles.consentContainer}>
        <LinearGradient
          colors={['#0f172a', '#1e3a5f', '#0f172a']}
          style={styles.consentGradient}
        >
          <View style={styles.consentCard}>
            <Ionicons name="shield-checkmark" size={64} color="#3b82f6" />
            <Text style={styles.consentTitle}>Recording Consent Required</Text>
            <Text style={styles.consentText}>
              This call will be recorded and transcribed for AI-powered coaching suggestions.
              Florida law requires all-party consent for recording.
            </Text>
            <Text style={styles.consentText}>
              Please confirm that you will obtain verbal consent from {prospect?.name || 'the prospect'} before proceeding.
            </Text>

            <TouchableOpacity
              style={styles.consentButton}
              onPress={handleConsentGrant}
            >
              <LinearGradient
                colors={['#3b82f6', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.consentButtonText}>I Will Obtain Consent</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleConsentDeny}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Call Header */}
      <View style={styles.header}>
        <View style={styles.callerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {prospect?.name?.charAt(0) || '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.callerName}>{prospect?.name || 'Unknown'}</Text>
            <Text style={styles.callerCompany}>{prospect?.company || ''}</Text>
          </View>
        </View>
        
        <View style={styles.callStatus}>
          <Animated.View
            style={[
              styles.recordingDot,
              { transform: [{ scale: pulseAnim }] }
            ]}
          />
          <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
        </View>
      </View>

      {/* AI Suggestions */}
      <View style={styles.suggestionsContainer}>
        <Text style={styles.sectionTitle}>AI Suggestions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {suggestions.length === 0 ? (
            <View style={styles.suggestionCard}>
              <Ionicons name="bulb-outline" size={24} color="#6b7280" />
              <Text style={styles.noSuggestionsText}>
                AI suggestions will appear here as the conversation progresses
              </Text>
            </View>
          ) : (
            suggestions.map((suggestion, idx) => (
              <View key={idx} style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <View style={[
                    styles.suggestionTypeBadge,
                    { backgroundColor: getSuggestionColor(suggestion.type) + '20' }
                  ]}>
                    <Text style={[
                      styles.suggestionType,
                      { color: getSuggestionColor(suggestion.type) }
                    ]}>
                      {suggestion.type}
                    </Text>
                  </View>
                </View>
                <Text style={styles.suggestionContent}>{suggestion.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Transcript */}
      <View style={styles.transcriptContainer}>
        <Text style={styles.sectionTitle}>Live Transcript</Text>
        <ScrollView style={styles.transcriptScroll}>
          {segments.map((segment, idx) => (
            <View
              key={idx}
              style={[
                styles.transcriptBubble,
                segment.speaker === 'salesperson'
                  ? styles.salespersonBubble
                  : styles.prospectBubble,
              ]}
            >
              <Text style={styles.speakerLabel}>
                {segment.speaker === 'salesperson' ? 'You' : 'Prospect'}
              </Text>
              <Text style={styles.transcriptText}>{segment.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Call Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={28}
            color={isMuted ? '#ef4444' : '#fff'}
          />
          <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <Ionicons name="call" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Ionicons name="keypad" size={28} color="#fff" />
          <Text style={styles.controlLabel}>Keypad</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getSuggestionColor = (type: string) => {
  switch (type) {
    case 'objection': return '#f59e0b';
    case 'product': return '#3b82f6';
    case 'closing': return '#10b981';
    case 'question': return '#8b5cf6';
    default: return '#6b7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  consentContainer: {
    flex: 1,
  },
  consentGradient: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  consentCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  consentTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  consentText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  consentButton: {
    marginTop: 24,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  consentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  callerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  callerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  callerCompany: {
    color: '#9ca3af',
    fontSize: 14,
  },
  callStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  duration: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  suggestionsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    minHeight: 100,
  },
  noSuggestionsText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  suggestionHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  suggestionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestionType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  suggestionContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  transcriptContainer: {
    flex: 1,
    padding: 16,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  salespersonBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
  },
  prospectBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  speakerLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginBottom: 4,
  },
  transcriptText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  controlButton: {
    alignItems: 'center',
    gap: 8,
  },
  controlButtonActive: {
    opacity: 0.7,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 12,
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
  },
});
