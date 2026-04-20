import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../lib/session'
import { supabase } from '../../lib/supabase'
import { useCoachStudentProgram, type CoachProgram } from './useStudentProgram'

export default function CoachStudentView() {
  const { studentId } = useParams()
  const { profile } = useAuth()
  const { data, loading, error, reload } = useCoachStudentProgram(studentId)
  const nav = useNavigate()

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return null

  async function createProgram() {
    const title = prompt('Program title?')
    if (!title) return
    const { error } = await supabase.from('programs').insert({
      student_id: data!.id,
      coach_id: profile!.id,
      title,
    })
    if (error) alert(error.message)
    else reload()
  }

  async function addGoal() {
    const title = prompt('Goal title?')
    if (!title) return
    const target = prompt('Target (optional)') || null
    const { error } = await supabase.from('goals').insert({
      student_id: data!.id,
      title,
      target,
    })
    if (error) alert(error.message)
    else reload()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Delete this goal?')) return
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) alert(error.message)
    else reload()
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => nav('/coach/students')} className="text-sm text-slate-500 mb-2">← Students</button>
        <h1 className="text-2xl font-semibold">{data.full_name}</h1>
      </div>

      <section>
        <SectionHeader title="Goals" onAdd={addGoal} addLabel="Add goal" />
        {data.goals.length ? (
          <ul className="space-y-2">
            {data.goals.map((g) => (
              <li
                key={g.id}
                className="bg-white rounded-xl border border-slate-200 p-3 flex items-start justify-between"
              >
                <div>
                  <div className="font-medium">{g.title}</div>
                  {g.target && <div className="text-xs text-slate-500">{g.target}</div>}
                  {g.due_date && <div className="text-xs text-slate-400">Due {g.due_date}</div>}
                </div>
                <button onClick={() => deleteGoal(g.id)} className="text-slate-400 text-sm">×</button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No goals yet.</Empty>
        )}
      </section>

      <section>
        <SectionHeader title="Programs" onAdd={createProgram} addLabel="New program" />
        {data.programs.length ? (
          <div className="space-y-4">
            {data.programs.map((p) => (
              <ProgramCard key={p.id} program={p} onChanged={reload} />
            ))}
          </div>
        ) : (
          <Empty>No program yet.</Empty>
        )}
      </section>
    </div>
  )
}

function ProgramCard({ program, onChanged }: { program: CoachProgram; onChanged: () => void }) {
  async function addWeek() {
    const nextIndex = (program.weeks.at(-1)?.index ?? 0) + 1
    const { error } = await supabase.from('weeks').insert({ program_id: program.id, index: nextIndex })
    if (error) alert(error.message)
    else onChanged()
  }

  async function duplicateWeek(weekId: string) {
    const src = program.weeks.find((w) => w.id === weekId)
    if (!src) return
    const nextIndex = (program.weeks.at(-1)?.index ?? 0) + 1

    const { data: newWeek, error: wErr } = await supabase
      .from('weeks')
      .insert({ program_id: program.id, index: nextIndex })
      .select('id')
      .single()
    if (wErr || !newWeek) return alert(wErr?.message ?? 'Failed')

    // Pull full slot data from source week and clone.
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name, day_index, exercise_slots ( exercise_id, order_index, coach_notes )')
      .eq('week_id', weekId)

    for (const s of sessions ?? []) {
      const { data: newSession } = await supabase
        .from('sessions')
        .insert({ week_id: newWeek.id, name: s.name, day_index: s.day_index })
        .select('id')
        .single()
      if (!newSession) continue
      const slots = (s as any).exercise_slots ?? []
      if (slots.length) {
        await supabase.from('exercise_slots').insert(
          slots.map((sl: any) => ({
            session_id: newSession.id,
            exercise_id: sl.exercise_id,
            order_index: sl.order_index,
            coach_notes: sl.coach_notes,
          }))
        )
      }
    }
    onChanged()
  }

  async function addSession(weekId: string, nextDay: number) {
    const name = prompt('Session name?')
    if (!name) return
    const { error } = await supabase
      .from('sessions')
      .insert({ week_id: weekId, name, day_index: nextDay })
    if (error) alert(error.message)
    else onChanged()
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{program.title}</h3>
        <button onClick={addWeek} className="text-sm text-slate-600">+ Week</button>
      </div>

      {program.weeks.map((w) => (
        <div key={w.id} className="border border-slate-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Week {w.index}
            </div>
            <button onClick={() => duplicateWeek(w.id)} className="text-xs text-slate-500">
              Duplicate
            </button>
          </div>
          <ul className="space-y-1">
            {w.sessions.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/coach/sessions/${s.id}/edit`}
                  className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50"
                >
                  <span className="text-sm">
                    <span className="text-slate-400 mr-2">D{s.day_index}</span>
                    {s.name}
                  </span>
                  {s.confirmed_at && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      done
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <button
            onClick={() => addSession(w.id, (w.sessions.at(-1)?.day_index ?? 0) + 1)}
            className="w-full text-xs py-2 rounded-lg border border-dashed border-slate-300 text-slate-500 mt-2"
          >
            + Add session
          </button>
        </div>
      ))}
    </div>
  )
}

function SectionHeader({ title, onAdd, addLabel }: { title: string; onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <button onClick={onAdd} className="text-sm text-slate-600">+ {addLabel}</button>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-500">{children}</div>
  )
}
