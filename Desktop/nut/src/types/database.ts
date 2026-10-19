/**
 * Database type definitions for EduTrack.
 * These mirror the Supabase PostgreSQL schema.
 * Extended as tables are added in Phase 3.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: School
        Insert: SchoolInsert
        Update: SchoolUpdate
      }
      school_memberships: {
        Row: SchoolMembership
        Insert: SchoolMembershipInsert
        Update: SchoolMembershipUpdate
      }
      user_profiles: {
        Row: UserProfile
        Insert: UserProfileInsert
        Update: UserProfileUpdate
      }
      academic_years: {
        Row: AcademicYear
        Insert: AcademicYearInsert
        Update: AcademicYearUpdate
      }
      academic_terms: {
        Row: AcademicTerm
        Insert: AcademicTermInsert
        Update: AcademicTermUpdate
      }
      classes: {
        Row: Class
        Insert: ClassInsert
        Update: ClassUpdate
      }
      streams: {
        Row: Stream
        Insert: StreamInsert
        Update: StreamUpdate
      }
      subjects: {
        Row: Subject
        Insert: SubjectInsert
        Update: SubjectUpdate
      }
      students: {
        Row: Student
        Insert: StudentInsert
        Update: StudentUpdate
      }
      student_enrollments: {
        Row: StudentEnrollment
        Insert: StudentEnrollmentInsert
        Update: StudentEnrollmentUpdate
      }
      guardians: {
        Row: Guardian
        Insert: GuardianInsert
        Update: GuardianUpdate
      }
      student_guardians: {
        Row: StudentGuardian
        Insert: StudentGuardianInsert
        Update: StudentGuardianUpdate
      }
      staff_profiles: {
        Row: StaffProfile
        Insert: StaffProfileInsert
        Update: StaffProfileUpdate
      }
      audit_logs: {
        Row: AuditLog
        Insert: AuditLogInsert
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      school_type: 'primary' | 'secondary' | 'combined'
      school_status: 'trial' | 'active' | 'suspended' | 'cancelled'
      membership_role: 'school_owner' | 'headteacher' | 'registrar' | 'bursar' | 'teacher' | 'support_staff'
      membership_status: 'active' | 'suspended' | 'removed'
      student_status: 'active' | 'transferred' | 'withdrawn' | 'graduated' | 'deceased'
      enrollment_status: 'active' | 'promoted' | 'transferred' | 'withdrawn' | 'completed'
      employment_status: 'active' | 'on_leave' | 'terminated'
    }
  }
}

// ─── Schools ────────────────────────────────────────────────────────────────

export interface School {
  id: string
  name: string
  slug: string
  type: 'primary' | 'secondary' | 'combined'
  address: string | null
  district: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  status: 'trial' | 'active' | 'suspended' | 'cancelled'
  subscription_plan_id: string | null
  subscription_start: string | null
  subscription_end: string | null
  is_trial: boolean
  created_at: string
  updated_at: string
}
export type SchoolInsert = Omit<School, 'id' | 'created_at' | 'updated_at'>
export type SchoolUpdate = Partial<SchoolInsert>

// ─── School Memberships ──────────────────────────────────────────────────────

export interface SchoolMembership {
  id: string
  school_id: string
  user_id: string
  role: 'school_owner' | 'headteacher' | 'registrar' | 'bursar' | 'teacher' | 'support_staff'
  extra_permissions: Json
  status: 'active' | 'suspended' | 'removed'
  joined_at: string
  updated_at: string
}
export type SchoolMembershipInsert = Omit<SchoolMembership, 'id' | 'joined_at' | 'updated_at'>
export type SchoolMembershipUpdate = Partial<SchoolMembershipInsert>

// ─── User Profiles ───────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}
export type UserProfileInsert = Omit<UserProfile, 'created_at' | 'updated_at'>
export type UserProfileUpdate = Partial<UserProfileInsert>

// ─── Academic Years ───────────────────────────────────────────────────────────

export interface AcademicYear {
  id: string
  school_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
}
export type AcademicYearInsert = Omit<AcademicYear, 'id' | 'created_at'>
export type AcademicYearUpdate = Partial<AcademicYearInsert>

// ─── Academic Terms ───────────────────────────────────────────────────────────

export interface AcademicTerm {
  id: string
  academic_year_id: string
  school_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
  created_at: string
}
export type AcademicTermInsert = Omit<AcademicTerm, 'id' | 'created_at'>
export type AcademicTermUpdate = Partial<AcademicTermInsert>

// ─── Classes ─────────────────────────────────────────────────────────────────

export interface Class {
  id: string
  school_id: string
  name: string
  level_code: string | null
  sort_order: number
  created_at: string
}
export type ClassInsert = Omit<Class, 'id' | 'created_at'>
export type ClassUpdate = Partial<ClassInsert>

// ─── Streams ─────────────────────────────────────────────────────────────────

export interface Stream {
  id: string
  class_id: string
  school_id: string
  name: string
  created_at: string
}
export type StreamInsert = Omit<Stream, 'id' | 'created_at'>
export type StreamUpdate = Partial<StreamInsert>

// ─── Subjects ────────────────────────────────────────────────────────────────

export interface Subject {
  id: string
  school_id: string
  name: string
  code: string | null
  is_active: boolean
  created_at: string
}
export type SubjectInsert = Omit<Subject, 'id' | 'created_at'>
export type SubjectUpdate = Partial<SubjectInsert>

// ─── Students ────────────────────────────────────────────────────────────────

export interface Student {
  id: string
  school_id: string
  admission_number: string
  full_name: string
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | 'not_stated' | null
  admission_date: string
  status: 'active' | 'transferred' | 'withdrawn' | 'graduated' | 'deceased'
  photo_url: string | null
  created_at: string
  updated_at: string
}
export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at'>
export type StudentUpdate = Partial<StudentInsert>

// ─── Student Enrollments ─────────────────────────────────────────────────────

export interface StudentEnrollment {
  id: string
  school_id: string
  student_id: string
  academic_year_id: string
  class_id: string
  stream_id: string | null
  status: 'active' | 'promoted' | 'transferred' | 'withdrawn' | 'completed'
  enrolled_date: string
  created_at: string
}
export type StudentEnrollmentInsert = Omit<StudentEnrollment, 'id' | 'created_at'>
export type StudentEnrollmentUpdate = Partial<StudentEnrollmentInsert>

// ─── Guardians ───────────────────────────────────────────────────────────────

export interface Guardian {
  id: string
  school_id: string
  full_name: string
  relationship: string
  phone_primary: string
  phone_secondary: string | null
  email: string | null
  address: string | null
  created_at: string
}
export type GuardianInsert = Omit<Guardian, 'id' | 'created_at'>
export type GuardianUpdate = Partial<GuardianInsert>

// ─── Student Guardians ────────────────────────────────────────────────────────

export interface StudentGuardian {
  id: string
  student_id: string
  guardian_id: string
  is_primary: boolean
  receives_reports: boolean
  receives_statements: boolean
}
export type StudentGuardianInsert = Omit<StudentGuardian, 'id'>
export type StudentGuardianUpdate = Partial<StudentGuardianInsert>

// ─── Staff Profiles ───────────────────────────────────────────────────────────

export interface StaffProfile {
  id: string
  school_id: string
  user_id: string
  employee_number: string | null
  job_title: string | null
  employment_status: 'active' | 'on_leave' | 'terminated'
  joined_date: string | null
  created_at: string
  updated_at: string
}
export type StaffProfileInsert = Omit<StaffProfile, 'id' | 'created_at' | 'updated_at'>
export type StaffProfileUpdate = Partial<StaffProfileInsert>

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  school_id: string | null
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Json | null
  new_values: Json | null
  ip_address: string | null
  created_at: string
}
export type AuditLogInsert = Omit<AuditLog, 'id' | 'created_at'>
