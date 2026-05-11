import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'INDIVIDUAL' | 'CORPORATE_ADMIN' | 'PLATFORM_ADMIN';
  language: 'TR' | 'EN';
  credits: number;
  emailVerified: boolean;
  department?: string | null;
  occupation?: string | null;
  company?: { id: string; name: string; credits: number } | null;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  loginSuperAdmin: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logoutSuperAdmin: () => Promise<void>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    department?: string | null;
    occupation?: string | null;
  }) => Promise<void>;
  availableCredits: () => number;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  isLoading: false,

  setUser: (user) => set({ user }),

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<User>('/api/auth/me');
      set({ user: res.data });
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password, rememberMe) => {
    const res = await apiClient.post<{ accessToken?: string }>('/api/auth/login', {
      email,
      password,
      rememberMe,
    });
    if (res.data.accessToken) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${res.data.accessToken}`;
    }
    await get().fetchMe();
  },

  logout: async () => {
    try {
      delete apiClient.defaults.headers.common.Authorization;
      await apiClient.post('/api/auth/logout');
    } finally {
      set({ user: null });
    }
  },

  loginSuperAdmin: async (email, password, rememberMe) => {
    const res = await apiClient.post<{ accessToken?: string }>('/api/auth/superadmin/login', {
      email,
      password,
      rememberMe,
    });
    if (res.data.accessToken) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${res.data.accessToken}`;
    }
    await get().fetchMe();
  },

  logoutSuperAdmin: async () => {
    await get().logout();
  },

  updateProfile: async (data) => {
    const res = await apiClient.patch<User>('/api/auth/me', data);
    set({ user: res.data });
  },

  availableCredits: () => {
    const { user } = get();
    if (!user) return 0;
    return user.role === 'CORPORATE_ADMIN'
      ? (user.company?.credits ?? 0)
      : user.credits;
  },
}));