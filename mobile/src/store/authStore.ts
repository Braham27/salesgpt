import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  company?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  refreshToken: null,

  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    
    set({
      user,
      isAuthenticated: true,
      accessToken,
      refreshToken,
    });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user');
    
    set({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
    });
  },

  loadAuth: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('access_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const userJson = await SecureStore.getItemAsync('user');

      if (accessToken && refreshToken && userJson) {
        const user = JSON.parse(userJson);
        set({
          user,
          isAuthenticated: true,
          accessToken,
          refreshToken,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
      set({ isLoading: false });
    }
  },

  updateUser: (userData) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    })),
}));

interface CallState {
  activeCallId: string | null;
  isCallActive: boolean;
  isMuted: boolean;
  consentGranted: boolean;
  callDuration: number;
  setActiveCall: (callId: string) => void;
  setCallActive: (active: boolean) => void;
  setMuted: (muted: boolean) => void;
  setConsentGranted: (granted: boolean) => void;
  incrementDuration: () => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCallId: null,
  isCallActive: false,
  isMuted: false,
  consentGranted: false,
  callDuration: 0,
  setActiveCall: (callId) => set({ activeCallId: callId }),
  setCallActive: (active) => set({ isCallActive: active }),
  setMuted: (muted) => set({ isMuted: muted }),
  setConsentGranted: (granted) => set({ consentGranted: granted }),
  incrementDuration: () => set((state) => ({ callDuration: state.callDuration + 1 })),
  resetCall: () =>
    set({
      activeCallId: null,
      isCallActive: false,
      isMuted: false,
      consentGranted: false,
      callDuration: 0,
    }),
}));

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

interface TranscriptState {
  segments: TranscriptSegment[];
  suggestions: Suggestion[];
  addSegment: (segment: TranscriptSegment) => void;
  addSuggestion: (suggestion: Suggestion) => void;
  removeSuggestion: (index: number) => void;
  clearTranscript: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  segments: [],
  suggestions: [],
  addSegment: (segment) =>
    set((state) => ({ segments: [...state.segments, segment] })),
  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [suggestion, ...state.suggestions].slice(0, 5),
    })),
  removeSuggestion: (index) =>
    set((state) => ({
      suggestions: state.suggestions.filter((_, i) => i !== index),
    })),
  clearTranscript: () => set({ segments: [], suggestions: [] }),
}));
