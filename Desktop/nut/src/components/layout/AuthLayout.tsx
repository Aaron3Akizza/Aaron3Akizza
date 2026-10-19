import { Outlet } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500 shadow-lg mb-4">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">EduTrack</h1>
          <p className="mt-1 text-primary-300 text-sm">School Management System</p>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl bg-white shadow-modal p-8">
          <Outlet />
        </div>

        <p className="mt-6 text-center text-xs text-primary-400">
          &copy; {new Date().getFullYear()} EduTrack Uganda. All rights reserved.
        </p>
      </div>
    </div>
  )
}
