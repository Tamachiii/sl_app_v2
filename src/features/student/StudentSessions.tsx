import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/session'
import { useStudentProgram } from './useStudentProgram'

export default function StudentSessions() {
  const { profile } = useAuth()
  const { weeks, loading, error } = useStudentProgram(profile?.id)

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!weeks.length)
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
        No program assigned yet. Your coach will set one up for you.
      </div>
    )

  return (
    <div className="space-y-6">
      {weeks.map((w) => (
        <section key={w.week_id}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Week {w.index}
          </h2>
          <ul className="space-y-2">
            {w.sessions.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/student/sessions/${s.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 active:bg-slate-50"
                >
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-500">Day {s.day_index}</div>
                  </div>
                  {s.confirmed_at ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      Confirmed
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      Pending
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
