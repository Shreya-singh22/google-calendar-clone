'use client';
import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  bootstrapped: boolean; // true once the /auth/me check has completed (success or 401)

  setUser: (user: AuthUser | null) => void;
  setBootstrapped: (v: boolean) => void;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>; // call once on app mount to restore session
}

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  return res;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  bootstrapped: false,

  setUser: (user) => set({ user }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),

  async login(email, password) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? 'Login failed');
    }
    const user = await res.json() as AuthUser;
    set({ user });
  },

  async register(email, password, name) {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? 'Registration failed');
    }
    const user = await res.json() as AuthUser;
    set({ user });
  },

  async logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    set({ user: null });
  },

  async bootstrap() {
    if (!API) {
      // No backend configured — skip auth entirely.
      set({ bootstrapped: true, user: null });
      return;
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000); // 10s max
      try {
        const res = await apiFetch('/auth/me', { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const user = await res.json() as AuthUser;
          set({ user, bootstrapped: true });
        } else {
          set({ user: null, bootstrapped: true });
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Network error or timeout — treat as logged-out, show auth page.
      set({ user: null, bootstrapped: true });
    }
  },
}));
