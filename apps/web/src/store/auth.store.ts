import { create } from 'zustand';
import { apiClient } from '../lib/api-client';
import axios from 'axios';

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

const OFFLINE_USER_KEY = 'skillbridge.offlineUser';

type OfflineSeedUser = {
  email: string;
  password: string;
  user: User;
};

const OFFLINE_SEED_USERS: OfflineSeedUser[] = [
  {
    email: 'admin@skillbridge.io',
    password: 'Admin123!',
    user: {
      id: 'offline-admin',
      email: 'admin@skillbridge.io',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'PLATFORM_ADMIN',
      language: 'TR',
      credits: 9999,
      emailVerified: true,
      company: null,
    },
  },
  {
    email: 'user@skillbridge.io',
    password: 'User123!',
    user: {
      id: 'offline-user',
      email: 'user@skillbridge.io',
      firstName: 'Test',
      lastName: 'Kullanıcı',
      role: 'INDIVIDUAL',
      language: 'TR',
      credits: 50,
      emailVerified: true,
      company: null,
    },
  },
  {
    email: 'kurumsal@skillbridge.io',
    password: 'Kurumsal123!',
    user: {
      id: 'offline-corporate',
      email: 'kurumsal@skillbridge.io',
      firstName: 'Kurumsal',
      lastName: 'Admin',
      role: 'CORPORATE_ADMIN',
      language: 'TR',
      credits: 0,
      emailVerified: true,
      company: {
        id: 'offline-company',
        name: 'Demo Teknoloji A.Ş.',
        credits: 500,
      },
    },
  },
];

function saveOfflineUser(user: User | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(OFFLINE_USER_KEY);
    return;
  }
  window.localStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));
}

function loadOfflineUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(OFFLINE_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function findOfflineSeedUser(email: string, password: string): User | null {
  const found = OFFLINE_SEED_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  return found ? found.user : null;
}

function isApiUnavailable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return !err.response || status === 404 || status === 502 || status === 503 || status === 504;
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
      saveOfflineUser(res.data);
    } catch {
      set({ user: loadOfflineUser() });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password, rememberMe) => {
    try {
      const res = await apiClient.post<{ accessToken?: string }>('/api/auth/login', {
        email,
        password,
        rememberMe,
      });
      if (res.data.accessToken) {
        apiClient.defaults.headers.common.Authorization = `Bearer ${res.data.accessToken}`;
      }
      await get().fetchMe();
      return;
    } catch (err) {
      if (!isApiUnavailable(err)) {
        throw err;
      }

      const offline = findOfflineSeedUser(email.trim(), password);
      if (!offline) {
        throw new Error('Geçersiz giriş (offline mod)');
      }

      set({ user: offline });
      saveOfflineUser(offline);
    }
  },

  logout: async () => {
    try {
      delete apiClient.defaults.headers.common.Authorization;
      await apiClient.post('/api/auth/logout');
    } finally {
      saveOfflineUser(null);
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
