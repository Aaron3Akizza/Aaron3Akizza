import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute'

import { LoginPage } from '@/pages/auth/LoginPage'
import { SelectSchoolPage } from '@/pages/auth/SelectSchoolPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { NotFoundPage } from '@/pages/auth/NotFoundPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { StudentsPage } from '@/pages/students/StudentsPage'
import { StaffPage } from '@/pages/staff/StaffPage'
import { ClassesPage } from '@/pages/classes/ClassesPage'
import { AttendancePage } from '@/pages/attendance/AttendancePage'
import { FeesPage } from '@/pages/fees/FeesPage'
import { AcademicPage } from '@/pages/academic/AcademicPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { ReportCardsPage } from '@/pages/reports/ReportCardsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { PlatformPage } from '@/pages/platform/PlatformPage'

export const router = createBrowserRouter([
  // ─── Auth routes (unauthenticated only) ──────────────────────────────────
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
        ],
      },
    ],
  },

  // ─── School selection (authenticated, no school required) ─────────────────
  {
    element: <ProtectedRoute requireSchool={false} />,
    children: [
      { path: '/select-school', element: <SelectSchoolPage /> },
    ],
  },

  // ─── Main app (authenticated + active school) ─────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard',    element: <DashboardPage /> },
          { path: '/students',     element: <StudentsPage /> },
          { path: '/staff',        element: <StaffPage /> },
          { path: '/classes',      element: <ClassesPage /> },
          { path: '/attendance',   element: <AttendancePage /> },
          { path: '/fees',         element: <FeesPage /> },
          { path: '/academic',     element: <AcademicPage /> },
          { path: '/reports',      element: <ReportsPage /> },
          { path: '/report-cards', element: <ReportCardsPage /> },
          { path: '/settings',     element: <SettingsPage /> },
        ],
      },
    ],
  },

  // ─── Platform admin (owner or super_admin only) ───────────────────────────
  {
    element: <ProtectedRoute allowedRoles={['school_owner']} />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/platform', element: <PlatformPage /> },
        ],
      },
    ],
  },

  // ─── Utility routes ───────────────────────────────────────────────────────
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '/', element: <ProtectedRoute />, children: [{ index: true, element: <DashboardPage /> }] },
  { path: '*', element: <NotFoundPage /> },
])
