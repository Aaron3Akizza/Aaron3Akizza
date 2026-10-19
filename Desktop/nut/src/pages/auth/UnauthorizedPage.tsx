import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-danger-100 p-4">
            <ShieldX size={40} className="text-danger-600" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-500 mb-6 max-w-xs">
          You do not have permission to view this page. Contact your school administrator if you believe this is an error.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
