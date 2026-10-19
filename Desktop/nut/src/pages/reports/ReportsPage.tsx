import { PageHeader } from '@/components/layout/PageHeader'

export function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports & Exports"
        description="Generate, view, and export school reports."
        breadcrumbs={[{ label: 'Reports' }]}
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Reports and exports module — coming in Phase 8.
      </div>
    </div>
  )
}
