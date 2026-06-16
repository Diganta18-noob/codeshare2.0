import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  avatar?: string;
  bio?: string;
  loginCount?: number;
  roomsCreated?: number;
  totalEdits?: number;
  createdAt?: string;
  lastLogin?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: AuthUser | null, token?: string | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user, token = null) => {
    set({
      user,
      token: token ?? get().token,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[Auth] Logout request failed:', err);
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        set({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed.' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  register: async (email, username, password) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed.' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  },
}));
