import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/session'
import { useStudentProgram } from './useStudentProgram'

export default function StudentHome() {
  const { profile } = useAuth()
  const { weeks, loading } = useStudentProgram(profile?.id)

  const allSessions = weeks.flatMap((w) => w.sessions)
  const pending = allSessions.filter((s) => !s.confirmed_at)
  const next = pending[0]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs text-slate-500">Hello,</p>
        <h1 className="text-2xl font-semibold">{profile?.full_name || 'athlete'}</h1>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Sessions left" value={pending.length} />
            <Stat label="Completed" value={allSessions.length - pending.length} />
          </div>

          {next ? (
            <Link
              to={`/student/sessions/${next.id}`}
              className="block bg-slate-900 text-white rounded-2xl p-5 active:bg-slate-800"
            >
              <p className="text-xs opacity-70">Next up</p>
              <p className="text-lg font-semibold">{next.name}</p>
              <p className="text-xs opacity-70 mt-1">
                Week {next.week_index} · Day {next.day_index}
              </p>
            </Link>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">
              No pending sessions. Nice work.
            </div>
          )}
        </>
      )}
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
