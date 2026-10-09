import { createContext } from 'react'
import type { AuthValue } from './AuthProvider'

export const AuthContext = createContext<AuthValue | null>(null)
