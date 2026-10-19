export type * from './database'

/** Generic paginated response wrapper */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

/** Standard API error shape */
export interface AppError {
  message: string
  code?: string
}

/** The current user's context within a school */
export interface SchoolContext {
  schoolId: string
  schoolName: string
  schoolType: 'primary' | 'secondary' | 'combined'
  role: 'school_owner' | 'headteacher' | 'registrar' | 'bursar' | 'teacher' | 'support_staff'
  extraPermissions: Record<string, boolean>
}
