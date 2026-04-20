import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface StudentRow {
  id: string
  full_name: string
  pending_count: number
  total_count: number
}

export function useCoachStudents(coachId: string | undefined) {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!coachId) return
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, full_name,
        programs!programs_student_id_fkey (
          weeks ( sessions ( id, confirmed_at ) )
        )
      `)
      .eq('coach_id', coachId)
      .eq('role', 'student')

    const rows: StudentRow[] = (data ?? []).map((p: any) => {
      const sessions = (p.programs ?? []).flatMap((pr: any) =>
        (pr.weeks ?? []).flatMap((w: any) => w.sessions ?? [])
      )
      return {
        id: p.id,
        full_name: p.full_name || '(unnamed)',
        total_count: sessions.length,
        pending_count: sessions.filter((s: any) => !s.confirmed_at).length,
      }
    })
    setStudents(rows)
    setLoading(false)
  }, [coachId])

  useEffect(() => {
    void load()
  }, [load])

  return { students, loading, reload: load }
}
