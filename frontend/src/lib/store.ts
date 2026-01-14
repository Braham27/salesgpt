import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          isAuthenticated: true,
          accessToken,
          refreshToken,
        }),
      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
        }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage',
    }
  )
);

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

interface UIState {
  sidebarOpen: boolean;
  showConsentDialog: boolean;
  showSettingsModal: boolean;
  toggleSidebar: () => void;
  setShowConsentDialog: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  showConsentDialog: false,
  showSettingsModal: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setShowConsentDialog: (show) => set({ showConsentDialog: show }),
  setShowSettingsModal: (show) => set({ showSettingsModal: show }),
}));
