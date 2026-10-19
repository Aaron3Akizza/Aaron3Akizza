import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-slate-100 text-slate-700',
  primary:  'bg-primary-100 text-primary-800',
  success:  'bg-success-100 text-success-700',
  warning:  'bg-amber-100 text-amber-800',
  danger:   'bg-danger-100 text-danger-700',
  accent:   'bg-accent-100 text-accent-800',
  outline:  'bg-transparent border border-slate-300 text-slate-700',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

/** Convenience: maps student/staff status strings to Badge variants */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    active: 'success',
    trial: 'warning',
    suspended: 'danger',
    cancelled: 'danger',
    terminated: 'danger',
    on_leave: 'warning',
    transferred: 'accent',
    withdrawn: 'danger',
    graduated: 'primary',
    deceased: 'default',
    promoted: 'primary',
    completed: 'success',
  }
  const label = status.replace(/_/g, ' ')
  return (
    <Badge variant={map[status] ?? 'default'}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </Badge>
  )
}
