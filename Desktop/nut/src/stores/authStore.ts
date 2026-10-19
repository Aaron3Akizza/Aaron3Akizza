import { createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import type { UserProfile, SchoolContext } from '@/types'

export interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  /** The school workspace the user is currently operating in */
  currentSchool: SchoolContext | null
  loading: boolean
  initialized: boolean
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  setCurrentSchool: (school: SchoolContext | null) => void
  refreshProfile: () => Promise<void>
}

export type AuthContextValue = AuthState & AuthActions

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

/** Check if the current user has a specific extra permission */
export function hasPermission(
  ctx: AuthContextValue,
  permission: string
): boolean {
  if (!ctx.currentSchool) return false
  const role = ctx.currentSchool.role
  // Owners always have all permissions within their school
  if (role === 'school_owner') return true
  return ctx.currentSchool.extraPermissions[permission] === true
}

/** Check if user holds one of the given roles in the current school */
export function hasRole(
  ctx: AuthContextValue,
  ...roles: SchoolContext['role'][]
): boolean {
  if (!ctx.currentSchool) return false
  return roles.includes(ctx.currentSchool.role)
}
