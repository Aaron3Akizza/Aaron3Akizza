import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { CalendarCheck } from 'lucide-react'

export function AttendancePage() {
  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Record and view daily student attendance."
        breadcrumbs={[{ label: 'Attendance' }]}
        actions={
          <Button leftIcon={<CalendarCheck size={16} />}>
            Take Attendance
          </Button>
        }
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Attendance module — coming in Phase 5.
      </div>
    </div>
  )
}
