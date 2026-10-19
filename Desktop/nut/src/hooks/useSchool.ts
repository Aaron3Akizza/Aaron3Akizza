import { useAuth } from '@/stores/authStore'

/**
 * Returns the current school context, throwing if called outside a school workspace.
 * Use this inside pages that require an active school.
 */
export function useSchool() {
  const auth = useAuth()
  if (!auth.currentSchool) {
    throw new Error('useSchool called outside a school workspace context')
  }
  return auth.currentSchool
}

/** Safe version: returns null instead of throwing */
export function useSchoolSafe() {
  const auth = useAuth()
  return auth.currentSchool
}
