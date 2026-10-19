import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
import { PageSpinner } from '@/components/ui'
import type { SchoolContext } from '@/types'

interface ProtectedRouteProps {
  /** Roles allowed to access this route. If empty, any authenticated user is allowed. */
  allowedRoles?: SchoolContext['role'][]
  /** Require an active school workspace */
  requireSchool?: boolean
}

export function ProtectedRoute({ allowedRoles = [], requireSchool = true }: ProtectedRouteProps) {
  const auth = useAuth()
  const location = useLocation()

  // Show spinner while session is being restored
  if (!auth.initialized) {
    return <PageSpinner />
  }

  // Not authenticated — redirect to login
  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Needs a school workspace but doesn't have one yet
  if (requireSchool && !auth.currentSchool) {
    return <Navigate to="/select-school" state={{ from: location }} replace />
  }

  // Role check
  if (
    allowedRoles.length > 0 &&
    auth.currentSchool &&
    !allowedRoles.includes(auth.currentSchool.role)
  ) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

/** Route accessible only to unauthenticated users (login, etc.) */
export function PublicOnlyRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.initialized) return <PageSpinner />

  if (auth.user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'
    return <Navigate to={from} replace />
  }

  return <Outlet />
}
