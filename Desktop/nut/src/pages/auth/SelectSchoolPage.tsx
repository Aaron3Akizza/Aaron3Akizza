import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { PageSpinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import { GraduationCap, ChevronRight } from 'lucide-react'
import type { SchoolContext } from '@/types'

type SchoolType = 'primary' | 'secondary' | 'combined'

interface SchoolOption {
  school_id: string
  school_name: string
  school_type: SchoolType
  role: SchoolContext['role']
  extra_permissions: Record<string, boolean>
}

export function SelectSchoolPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMemberships() {
      if (!auth.user) return
      const { data, error: err } = await supabase
        .from('school_memberships')
        .select(`
          school_id,
          role,
          extra_permissions,
          schools ( id, name, type )
        `)
        .eq('user_id', auth.user.id)
        .eq('status', 'active')

      if (err) {
        setError('Failed to load your school memberships. Please try again.')
      } else {
        const options: SchoolOption[] = (data ?? []).map((m) => {
          const school = Array.isArray(m.schools) ? m.schools[0] : m.schools
          return {
            school_id: m.school_id,
            school_name: school?.name ?? 'Unknown School',
            school_type: (school?.type ?? 'secondary') as SchoolType,
            role: m.role as SchoolContext['role'],
            extra_permissions: (m.extra_permissions as Record<string, boolean>) ?? {},
          }
        })
        setSchools(options)

        // Auto-select if only one school
        if (options.length === 1) {
          selectSchool(options[0])
        }
      }
      setLoading(false)
    }
    fetchMemberships()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user])

  function selectSchool(option: SchoolOption) {
    auth.setCurrentSchool({
      schoolId: option.school_id,
      schoolName: option.school_name,
      schoolType: option.school_type,
      role: option.role,
      extraPermissions: option.extra_permissions,
    })
    navigate('/dashboard')
  }

  if (loading) return <PageSpinner />

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 mb-4">
            <GraduationCap size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Select School</h1>
          <p className="mt-1 text-sm text-slate-500">Choose the school workspace to open</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {schools.length === 0 && !loading ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-slate-600">You are not a member of any school workspace.</p>
            <p className="mt-1 text-xs text-slate-400">Contact your administrator to be added.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {schools.map((s) => (
              <button
                key={s.school_id}
                onClick={() => selectSchool(s)}
                className="w-full flex items-center justify-between rounded-xl bg-white border border-slate-200 px-5 py-4 text-left hover:border-primary-400 hover:bg-primary-50 transition-colors group"
              >
                <div>
                  <p className="font-semibold text-slate-900">{s.school_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">
                    {s.school_type} school &middot; {s.role.replace(/_/g, ' ')}
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-primary-600 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
