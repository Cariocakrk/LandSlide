"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // 'OPERATOR' or standard
  phoneNumber?: string;
  cep?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => {
        set({ user, token });
        // Optionally save to header or cookies
      },
      logout: () => {
        set({ user: null, token: null });
      },
    }),
    {
      name: 'geoshield-auth-store', // Unique key for LocalStorage persistence
    }
  )
);
