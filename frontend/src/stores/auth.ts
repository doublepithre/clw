import { create } from 'zustand'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const user = await api.post<User>('/auth/login', { email, password })
    set({ user, isAuthenticated: true })
  },

  register: async (name: string, email: string, password: string) => {
    const user = await api.post<User>('/auth/register', { name, email, password })
    set({ user, isAuthenticated: true })
  },

  logout: async () => {
    await api.post('/auth/logout')
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    try {
      const user = await api.get<User>('/auth/me')
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
