import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  type: string;
  permissions: string[];
}

interface Business {
  id: string;
  name: string;
  type: string;
  description?: string;
  subscription: {
    plan: string;
    status: string;
    trialEndsAt?: string | null;
    expiresAt?: string | null;
    modules: string[];
    usersLimit: number;
    smsCredits: number;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  currentBusiness: Business | null;
  isHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  setCurrentBusiness: (business: Business | null) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      currentBusiness: null,
      isHydrated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      setCurrentBusiness: (business) => set({ currentBusiness: business }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, currentBusiness: null }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'auth-storage',
      // Only persist auth data, not business/subscription data
      // This ensures fresh data is fetched from API each time
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Clear any old cached business data from previous version
        if (state) {
          state.setCurrentBusiness(null);
          state.setHydrated();
        }
      },
    }
  )
);
