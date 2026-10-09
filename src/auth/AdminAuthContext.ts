import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'

export type AdminAuthValue = {
  user: User | null
  loading: boolean
  configured: boolean
  isAdmin: boolean
  signIn: (identifier: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthValue | null>(null)
