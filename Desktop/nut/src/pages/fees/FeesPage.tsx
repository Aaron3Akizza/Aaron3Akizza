import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export function FeesPage() {
  return (
    <div>
      <PageHeader
        title="Fees & Payments"
        description="Manage fee structures, student accounts, and payment records."
        breadcrumbs={[{ label: 'Fees' }]}
        actions={
          <Button leftIcon={<Plus size={16} />}>
            Record Payment
          </Button>
        }
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Financial management module — coming in Phase 6.
      </div>
    </div>
  )
}
