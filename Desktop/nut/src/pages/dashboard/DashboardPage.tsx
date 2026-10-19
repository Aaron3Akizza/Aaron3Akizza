import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/Card'
import { useAuth } from '@/stores/authStore'
import { Users, CalendarCheck, Banknote, GraduationCap } from 'lucide-react'

export function DashboardPage() {
  const auth = useAuth()
  const school = auth.currentSchool

  return (
    <div>
      <PageHeader
        title={`Welcome back${auth.profile?.full_name ? `, ${auth.profile.full_name.split(' ')[0]}` : ''}`}
        description={school ? `${school.schoolName} — ${school.schoolType} school` : undefined}
      />

      {/* KPI cards — data will be live once Phase 4+ modules are complete */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Enrolled Students"
          value="—"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Attendance Today"
          value="—"
          icon={<CalendarCheck size={20} />}
        />
        <StatCard
          label="Outstanding Fees"
          value="—"
          icon={<Banknote size={20} />}
        />
        <StatCard
          label="Active Classes"
          value="—"
          icon={<GraduationCap size={20} />}
        />
      </div>

      {/* Placeholder for activity feed and charts — added in Phase 8 */}
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Dashboard analytics will appear here once school data is configured.
      </div>
    </div>
  )
}
