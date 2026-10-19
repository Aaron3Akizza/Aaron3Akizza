import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { UserPlus } from 'lucide-react'

export function StudentsPage() {
  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage student registrations, profiles, and enrollments."
        breadcrumbs={[{ label: 'Students' }]}
        actions={
          <Button leftIcon={<UserPlus size={16} />}>
            Register Student
          </Button>
        }
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Student management module — coming in Phase 4.
      </div>
    </div>
  )
}
