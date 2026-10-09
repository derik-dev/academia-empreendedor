import { useContext } from 'react'
import { AdminAuthContext } from './AdminAuthContext'

export function useAdminAuth() {
  const value = useContext(AdminAuthContext)
  if (!value) throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider')
  return value
}
