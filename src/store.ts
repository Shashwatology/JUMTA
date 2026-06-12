import { create } from 'zustand';
import { routingService, type OptimizedRoute } from './services/routingService';
import { predictionService, type PredictionResult } from './services/predictionService';

interface UserProfile {
  name: string;
  gender: string;
  age: string;
  category: 'RESIDENT' | 'STUDENT' | 'TOURIST' | 'WOMEN' | 'ELDER';
  language: 'en' | 'hi';
}

interface MaaSState {
  // Onboarding & Auth Flow
  authStep: 'splash' | 'welcome' | 'otp' | 'profile' | 'authenticated';
  setAuthStep: (step: 'splash' | 'welcome' | 'otp' | 'profile' | 'authenticated') => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  isLoggedIn: boolean;
  logOut: () => void;

  // Journey planner selections
  startStopId: string;
  endStopId: string;
  setStartStopId: (id: string) => void;
  setEndStopId: (id: string) => void;

  // Environmental sliders
  peakHourFactor: number; // 0.5 - 1.5
  weather: 'CLEAR' | 'RAIN' | 'HOT_WAVE';
  event: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA';
  setPeakHourFactor: (val: number) => void;
  setWeather: (w: 'CLEAR' | 'RAIN' | 'HOT_WAVE') => void;
  setEvent: (e: 'NONE' | 'FESTIVAL' | 'EXAM' | 'MELA') => void;

  // Routing outputs
  calculatedRoutes: OptimizedRoute[];
  aiOutput: PredictionResult;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;
  triggerSearch: () => void;
  lastSearchExecuted: boolean;
  clearSearch: () => void;

  // Active view routers
  citizenScreen: 'home' | 'trips' | 'checkout' | 'tracking' | 'wallet' | 'profile' | 'ai_assistant' | 'digital_twin' | 'intelligence' | 'safety' | 'carbon';
  setCitizenScreen: (screen: 'home' | 'trips' | 'checkout' | 'tracking' | 'wallet' | 'profile' | 'ai_assistant' | 'digital_twin' | 'intelligence' | 'safety' | 'carbon') => void;

  controlCenterOperator: 'JCTSL' | 'JMRC' | 'TRAFFIC' | 'JDA' | 'RTO';
  setControlCenterOperator: (op: 'JCTSL' | 'JMRC' | 'TRAFFIC' | 'JDA' | 'RTO') => void;

  // User Wallet details
  walletBalance: number;
  rechargeWallet: (amount: number) => void;
  deductWallet: (amount: number) => boolean;

  // Safety
  isSOSActive: boolean;
  triggerSOS: () => void;
  resetSOS: () => void;

  userLocation: { lat: number; lng: number; nameEn: string } | null;
  setUserLocation: (loc: { lat: number; lng: number; nameEn: string } | null) => void;
  activePass: string | null;
  setActivePass: (passType: string | null) => void;
  collegeMode: boolean;
  setCollegeMode: (val: boolean) => void;
  touristMode: boolean;
  setTouristMode: (val: boolean) => void;
  womenMode: boolean;
  setWomenMode: (val: boolean) => void;
  elderMode: boolean;
  setElderMode: (val: boolean) => void;

  // Digital Twin specific active layers
  twinLayers: {
    road: boolean;
    metro: boolean;
    bus: boolean;
    flows: boolean;
    signals: boolean;
    hotspots: boolean;
    phase2: boolean;
  };
  toggleTwinLayer: (layer: keyof MaaSState['twinLayers']) => void;
}

export const useMaaSStore = create<MaaSState>((set, get) => ({
  // Onboarding init
  authStep: 'splash',
  setAuthStep: (step) => set({ authStep: step }),
  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile, isLoggedIn: true }),
  isLoggedIn: false,
  logOut: () => set({ authStep: 'welcome', isLoggedIn: false, userProfile: null }),

  startStopId: 'M_MANSAROVAR',
  endStopId: 'B_MNIT', // Real default routing: Mansarovar to MNIT
  setStartStopId: (id) => set({ startStopId: id }),
  setEndStopId: (id) => set({ endStopId: id }),

  peakHourFactor: 1.0,
  weather: 'CLEAR',
  event: 'NONE',
  setPeakHourFactor: (val) => {
    set({ peakHourFactor: val });
    if (get().lastSearchExecuted) {
      get().triggerSearch();
    }
  },
  setWeather: (w) => {
    set({ weather: w });
    if (get().lastSearchExecuted) {
      get().triggerSearch();
    }
  },
  setEvent: (e) => {
    set({ event: e });
    if (get().lastSearchExecuted) {
      get().triggerSearch();
    }
  },

  calculatedRoutes: [],
  aiOutput: predictionService.getTransitNetworkPredictions(1.0, 'CLEAR', 'NONE'),
  selectedRouteId: null,
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),
  lastSearchExecuted: false,

  triggerSearch: () => {
    const { startStopId, endStopId, peakHourFactor, weather, event, collegeMode, touristMode, womenMode, elderMode } = get();
    const routes = routingService.calculateRoutes(startStopId, endStopId, peakHourFactor, weather, event, true, collegeMode, touristMode, womenMode, elderMode);
    const ai = predictionService.getTransitNetworkPredictions(peakHourFactor, weather, event);
    set({
      calculatedRoutes: routes,
      aiOutput: ai,
      selectedRouteId: routes[0]?.id || null,
      lastSearchExecuted: true,
    });
  },

  clearSearch: () => {
    set({
      calculatedRoutes: [],
      selectedRouteId: null,
      lastSearchExecuted: false
    });
  },

  citizenScreen: 'home',
  setCitizenScreen: (screen) => set({ citizenScreen: screen }),

  controlCenterOperator: 'JCTSL',
  setControlCenterOperator: (op) => set({ controlCenterOperator: op }),

  walletBalance: 320,
  rechargeWallet: (amount) => set((state) => ({ walletBalance: state.walletBalance + amount })),
  deductWallet: (amount) => {
    const balance = get().walletBalance;
    if (balance >= amount) {
      set({ walletBalance: balance - amount });
      return true;
    }
    return false;
  },

  isSOSActive: false,
  triggerSOS: () => set({ isSOSActive: true }),
  resetSOS: () => set({ isSOSActive: false }),

  twinLayers: {
    road: true,
    metro: true,
    bus: true,
    flows: true,
    signals: true,
    hotspots: true,
    phase2: true,
  },
  toggleTwinLayer: (layer) => set((state) => ({
    twinLayers: {
      ...state.twinLayers,
      [layer]: !state.twinLayers[layer],
    }
  })),

  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  activePass: null,
  setActivePass: (passType) => set({ activePass: passType }),
  collegeMode: false,
  setCollegeMode: (val) => {
    set({ collegeMode: val });
    if (get().lastSearchExecuted) {
      get().triggerSearch();
    }
  },
  touristMode: false,
  setTouristMode: (val) => {
    set({ touristMode: val });
    if (get().lastSearchExecuted) {
      get().triggerSearch();
    }
  },
  womenMode: false,
  setWomenMode: (val) => {
    set({ womenMode: val });
    if (get().lastSearchExecuted) {
      get().triggerSearch();
    }
  },
  elderMode: false,
  setElderMode: (val) => {
    set({ elderMode: val });
    if (get().lastSearchExecuted) {
      get().triggerSearch();
    }
  },
}));
