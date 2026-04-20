import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/session'

interface ReviewRow {
  id: string
  name: string
  confirmed_at: string
  student_id: string
  student_name: string
  week_index: number
  student_note: string | null
}

export default function CoachReviews() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    ;(async () => {
      const { data } = await supabase
        .from('sessions')
        .select(`
          id, name, confirmed_at, student_note,
          weeks!inner (
            index,
            programs!inner (
              student_id,
              coach_id,
              student:profiles!programs_student_id_fkey ( id, full_name )
            )
          )
        `)
        .eq('weeks.programs.coach_id', profile.id)
        .not('confirmed_at', 'is', null)
        .order('confirmed_at', { ascending: false })
        .limit(30)

      const mapped: ReviewRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        confirmed_at: r.confirmed_at,
        student_note: r.student_note,
        week_index: r.weeks.index,
        student_id: r.weeks.programs.student.id,
        student_name: r.weeks.programs.student.full_name || '(unnamed)',
      }))
      setRows(mapped)
      setLoading(false)
    })()
  }, [profile?.id])

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>
  if (!rows.length)
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
        No confirmed sessions yet.
      </div>
    )

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            to={`/coach/sessions/${r.id}/edit`}
            className="block bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.student_name}</div>
              <div className="text-xs text-slate-500">
                {new Date(r.confirmed_at).toLocaleDateString()}
              </div>
            </div>
            <div className="text-sm text-slate-600">
              Week {r.week_index} · {r.name}
            </div>
            {r.student_note && (
              <p className="text-xs text-slate-500 mt-1 italic">“{r.student_note}”</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
