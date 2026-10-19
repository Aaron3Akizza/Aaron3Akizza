import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export function ClassesPage() {
  return (
    <div>
      <PageHeader
        title="Classes & Subjects"
        description="Configure classes, streams, subjects, and teacher assignments."
        breadcrumbs={[{ label: 'Classes' }]}
        actions={
          <Button leftIcon={<Plus size={16} />}>
            Add Class
          </Button>
        }
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Classes and subjects module — coming in Phase 4.
      </div>
    </div>
  )
}
