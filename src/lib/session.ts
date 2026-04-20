import { createContext, useContext } from 'react'
import type { Profile } from '../types/domain'

export interface AuthState {
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  profile: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)
