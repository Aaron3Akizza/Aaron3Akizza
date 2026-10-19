import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import type { ReactNode } from 'react'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  onDismiss?: () => void
  className?: string
}

const config: Record<
  AlertVariant,
  { container: string; icon: ReactNode; iconColor: string }
> = {
  info: {
    container: 'bg-primary-50 border-primary-200',
    iconColor: 'text-primary-600',
    icon: <Info size={18} />,
  },
  success: {
    container: 'bg-success-50 border-success-100',
    iconColor: 'text-success-600',
    icon: <CheckCircle2 size={18} />,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
    icon: <AlertTriangle size={18} />,
  },
  error: {
    container: 'bg-danger-50 border-danger-100',
    iconColor: 'text-danger-600',
    icon: <AlertCircle size={18} />,
  },
}

export function Alert({ variant = 'info', title, children, onDismiss, className }: AlertProps) {
  const { container, icon, iconColor } = config[variant]

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3',
        container,
        className
      )}
    >
      <span className={cn('mt-0.5 shrink-0', iconColor)}>{icon}</span>
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold text-slate-900 mb-0.5">{title}</p>}
        <div className="text-slate-700">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-2 shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
