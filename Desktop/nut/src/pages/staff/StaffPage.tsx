import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { UserPlus } from 'lucide-react'

export function StaffPage() {
  return (
    <div>
      <PageHeader
        title="Staff"
        description="Manage staff profiles, roles, and assignments."
        breadcrumbs={[{ label: 'Staff' }]}
        actions={
          <Button leftIcon={<UserPlus size={16} />}>
            Add Staff Member
          </Button>
        }
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Staff management module — coming in Phase 4.
      </div>
    </div>
  )
}
