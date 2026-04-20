import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface SessionRow {
  id: string
  name: string
  day_index: number
  confirmed_at: string | null
  week_id: string
  week_index: number
  program_id: string
  program_title: string
}

export interface WeekGroup {
  week_id: string
  index: number
  sessions: SessionRow[]
}

export function useStudentProgram(studentId: string | undefined) {
  const [weeks, setWeeks] = useState<WeekGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false
    setLoading(true)

    supabase
      .from('programs')
      .select('id, title, weeks(id, index, sessions(id, name, day_index, confirmed_at))')
      .eq('student_id', studentId)
      .order('index', { referencedTable: 'weeks', ascending: true })
      .order('day_index', { referencedTable: 'weeks.sessions', ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }
        const program = data?.[0]
        if (!program) {
          setWeeks([])
          setLoading(false)
          return
        }
        const grouped: WeekGroup[] = (program.weeks ?? []).map((w) => ({
          week_id: w.id,
          index: w.index,
          sessions: (w.sessions ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            day_index: s.day_index,
            confirmed_at: s.confirmed_at,
            week_id: w.id,
            week_index: w.index,
            program_id: program.id,
            program_title: program.title,
          })),
        }))
        setWeeks(grouped)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [studentId])

  return { weeks, loading, error }
}
