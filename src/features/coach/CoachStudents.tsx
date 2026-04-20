import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/session'
import { useCoachStudents } from './useCoachStudents'

export default function CoachStudents() {
  const { profile } = useAuth()
  const { students, loading } = useCoachStudents(profile?.id)

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>

  if (!students.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-600 space-y-2">
        <p>No students yet.</p>
        <p className="text-xs text-slate-500">
          Once a student signs up, link them with SQL:
          <br />
          <code className="text-[11px]">
            update profiles set coach_id='{profile?.id}' where id='&lt;student-uuid&gt;';
          </code>
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {students.map((s) => (
        <li key={s.id}>
          <Link
            to={`/coach/students/${s.id}`}
            className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
          >
            <div>
              <div className="font-medium">{s.full_name}</div>
              <div className="text-xs text-slate-500">
                {s.total_count - s.pending_count}/{s.total_count} sessions done
              </div>
            </div>
            {s.pending_count > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                {s.pending_count} pending
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
