import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface CoachSessionRow {
  id: string
  name: string
  day_index: number
  confirmed_at: string | null
}

export interface CoachWeekRow {
  id: string
  index: number
  sessions: CoachSessionRow[]
}

export interface CoachProgram {
  id: string
  title: string
  weeks: CoachWeekRow[]
}

export interface CoachStudentView {
  id: string
  full_name: string
  programs: CoachProgram[]
  goals: { id: string; title: string; target: string | null; due_date: string | null }[]
}

export function useCoachStudentProgram(studentId: string | undefined) {
  const [data, setData] = useState<CoachStudentView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    const [{ data: profile, error: pErr }, { data: goals }] = await Promise.all([
      supabase
        .from('profiles')
        .select(`
          id, full_name,
          programs!programs_student_id_fkey (
            id, title,
            weeks ( id, index, sessions ( id, name, day_index, confirmed_at ) )
          )
        `)
        .eq('id', studentId)
        .maybeSingle(),
      supabase
        .from('goals')
        .select('id, title, target, due_date')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false }),
    ])

    if (pErr || !profile) {
      setError(pErr?.message ?? 'Student not found')
      setLoading(false)
      return
    }

    const programs: CoachProgram[] = ((profile as any).programs ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      weeks: (p.weeks ?? [])
        .sort((a: any, b: any) => a.index - b.index)
        .map((w: any) => ({
          id: w.id,
          index: w.index,
          sessions: (w.sessions ?? []).sort((a: any, b: any) => a.day_index - b.day_index),
        })),
    }))

    setData({
      id: profile.id,
      full_name: (profile as any).full_name,
      programs,
      goals: (goals ?? []) as any,
    })
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load }
}
