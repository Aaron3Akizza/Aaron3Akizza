import { PageHeader } from '@/components/layout/PageHeader'

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="School Settings"
        description="Configure your school profile, academic years, and system preferences."
        breadcrumbs={[{ label: 'Settings' }]}
      />
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        School settings module — coming in Phase 4.
      </div>
    </div>
  )
}
