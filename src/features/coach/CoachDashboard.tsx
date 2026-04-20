import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/session'
import { useCoachStudents } from './useCoachStudents'

export default function CoachDashboard() {
  const { profile } = useAuth()
  const { students, loading } = useCoachStudents(profile?.id)

  const totalStudents = students.length
  const totalSessions = students.reduce((n, s) => n + s.total_count, 0)
  const pending = students.reduce((n, s) => n + s.pending_count, 0)
  const done = totalSessions - pending

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Students" value={totalStudents} />
        <Stat label="Pending" value={pending} />
        <Stat label="Completed" value={done} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">Recent activity</h2>
          <Link to="/coach/reviews" className="text-sm text-slate-500">See all →</Link>
        </div>
        <p className="text-sm text-slate-500">Check the Reviews tab for recently confirmed sessions.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Students</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : students.length ? (
          <ul className="space-y-1">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/coach/students/${s.id}`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50"
                >
                  <span className="text-sm">{s.full_name}</span>
                  <span className="text-xs text-slate-500">
                    {s.pending_count} pending
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No students linked yet.</p>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}
