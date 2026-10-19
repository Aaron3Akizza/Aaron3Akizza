import { PageHeader } from '@/components/layout/PageHeader'

export function ReportCardsPage() {
  return (
    <div>
      <PageHeader
        title="Report Cards"
        description="Generate, review, and publish student report cards."
        breadcrumbs={[{ label: 'Report Cards' }]}
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Report card generation module — coming in Phase 7.
      </div>
    </div>
  )
}
