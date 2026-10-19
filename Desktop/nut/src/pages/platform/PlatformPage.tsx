import { PageHeader } from '@/components/layout/PageHeader'

export function PlatformPage() {
  return (
    <div>
      <PageHeader
        title="Platform Administration"
        description="Manage schools, subscriptions, and platform settings."
        breadcrumbs={[{ label: 'Platform Admin' }]}
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        Platform administration module — coming in Phase 9.
      </div>
    </div>
  )
}
