import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth, hasRole } from '@/stores/authStore'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  CalendarCheck,
  Banknote,
  GraduationCap,
  FileText,
  Settings,
  ChevronRight,
  School,
  BarChart3,
  X,
} from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  end?: boolean
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard',   path: '/dashboard',   icon: <LayoutDashboard size={18} />, end: true },
  { label: 'Students',    path: '/students',    icon: <Users size={18} /> },
  { label: 'Staff',       path: '/staff',       icon: <UserCheck size={18} />, roles: ['school_owner','headteacher'] },
  { label: 'Classes',     path: '/classes',     icon: <School size={18} /> },
  { label: 'Attendance',  path: '/attendance',  icon: <CalendarCheck size={18} /> },
  { label: 'Fees',        path: '/fees',        icon: <Banknote size={18} />, roles: ['school_owner','bursar','headteacher'] },
  { label: 'Academic',    path: '/academic',    icon: <GraduationCap size={18} /> },
  { label: 'Reports',     path: '/reports',     icon: <BarChart3 size={18} /> },
  { label: 'Report Cards',path: '/report-cards',icon: <FileText size={18} /> },
  { label: 'Settings',    path: '/settings',    icon: <BookOpen size={18} />, roles: ['school_owner','headteacher'] },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const auth = useAuth()
  const location = useLocation()

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (!auth.currentSchool) return false
    return item.roles.includes(auth.currentSchool.role)
  })

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-primary-950 transition-transform duration-300',
          'lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-primary-900">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">EduTrack</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-primary-400 hover:text-white hover:bg-primary-800 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* School name */}
        {auth.currentSchool && (
          <div className="px-5 py-3 border-b border-primary-900">
            <p className="text-xs text-primary-400 uppercase tracking-wide">School</p>
            <p className="mt-0.5 text-sm font-medium text-white truncate">
              {auth.currentSchool.schoolName}
            </p>
            <span className="mt-1 inline-flex items-center rounded-full bg-primary-800 px-2 py-0.5 text-xs text-primary-200 capitalize">
              {auth.currentSchool.role.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-100',
                      isActive
                        ? 'bg-primary-700 text-white'
                        : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                    )
                  }
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {location.pathname.startsWith(item.path) && !item.end && (
                    <ChevronRight size={14} className="text-primary-400" />
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Platform admin link */}
        {hasRole(auth as ReturnType<typeof useAuth>, 'school_owner') && (
          <div className="border-t border-primary-900 px-3 py-3">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                )
              }
            >
              <Settings size={18} />
              School Settings
            </NavLink>
          </div>
        )}
      </aside>
    </>
  )
}
