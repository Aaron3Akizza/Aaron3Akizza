import { PageHeader } from '@/components/layout/PageHeader'

export function AcademicPage() {
  return (
    <div>
      <PageHeader
        title="Academic Assessment"
        description="Configure assessments, enter marks, and manage grading."
        breadcrumbs={[{ label: 'Academic' }]}
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Academic assessment module — coming in Phase 7.
      </div>
    </div>
  )
}
