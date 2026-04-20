export type Role = 'coach' | 'student'

export interface Profile {
  id: string
  role: Role
  full_name: string
  coach_id?: string | null
}

export interface Program {
  id: string
  student_id: string
  coach_id: string
  title: string
  created_at: string
}

export interface Week {
  id: string
  program_id: string
  index: number
  notes?: string
}

export interface Session {
  id: string
  week_id: string
  name: string
  day_index: number
  confirmed_at?: string | null
  student_note?: string
}

export interface Exercise {
  id: string
  name: string
  type: string
}

export interface ExerciseSlot {
  id: string
  session_id: string
  exercise_id: string
  order_index: number
  coach_notes?: string
}

export interface SetLog {
  id: string
  slot_id: string
  set_index: number
  reps: number
  weight: number
  rpe?: number
}

export interface Goal {
  id: string
  student_id: string
  title: string
  target?: string
  due_date?: string
}
