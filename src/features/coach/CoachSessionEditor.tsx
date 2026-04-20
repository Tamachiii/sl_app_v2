import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

interface SetLog {
  id: string
  slot_id: string
  set_index: number
  reps: number
  weight: number
  rpe: number | null
}

interface Slot {
  id: string
  order_index: number
  coach_notes: string | null
  exercise: { id: string; name: string; type: string }
  set_logs: SetLog[]
}

interface Session {
  id: string
  name: string
  day_index: number
  slots: Slot[]
}

interface Exercise {
  id: string
  name: string
  type: string
}

export default function CoachSessionEditor() {
  const { sessionId } = useParams()
  const nav = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase
      .from('sessions')
      .select(`
        id, name, day_index,
        exercise_slots (
          id, order_index, coach_notes,
          exercise:exercises ( id, name, type ),
          set_logs ( id, slot_id, set_index, reps, weight, rpe )
        )
      `)
      .eq('id', sessionId)
      .order('order_index', { referencedTable: 'exercise_slots' })
      .order('set_index', { referencedTable: 'exercise_slots.set_logs' })
      .maybeSingle()
    if (data) {
      setSession({
        id: data.id,
        name: (data as any).name,
        day_index: (data as any).day_index,
        slots: ((data as any).exercise_slots ?? []) as Slot[],
      })
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!adding) return
    supabase
      .from('exercises')
      .select('id, name, type')
      .order('name')
      .then(({ data }) => setExercises((data ?? []) as Exercise[]))
  }, [adding])

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>
  if (!session) return <p className="text-sm text-red-600">Session not found</p>

  async function saveName(name: string) {
    await supabase.from('sessions').update({ name }).eq('id', session!.id)
  }

  async function addSlot(exerciseId: string) {
    const nextOrder = (session!.slots.at(-1)?.order_index ?? 0) + 1
    const { error } = await supabase
      .from('exercise_slots')
      .insert({ session_id: session!.id, exercise_id: exerciseId, order_index: nextOrder })
    if (error) alert(error.message)
    setAdding(false)
    setQuery('')
    load()
  }

  async function deleteSession() {
    if (!confirm('Delete this session?')) return
    const { error } = await supabase.from('sessions').delete().eq('id', session!.id)
    if (error) alert(error.message)
    else nav(-1)
  }

  const filtered = exercises.filter((e) =>
    (e.name + ' ' + e.type).toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div>
        <button onClick={() => nav(-1)} className="text-sm text-slate-500 mb-2">← Back</button>
        <input
          defaultValue={session.name}
          onBlur={(e) => saveName(e.target.value)}
          className="w-full text-xl font-semibold bg-transparent border-b border-slate-200 py-1 focus:outline-none focus:border-slate-400"
        />
        <p className="text-xs text-slate-500 mt-1">Day {session.day_index}</p>
      </div>

      {session.slots.map((slot) => (
        <SlotEditor key={slot.id} slot={slot} onChanged={load} />
      ))}

      {adding ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
          <ul className="max-h-64 overflow-auto space-y-1">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => addSlot(e.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50"
                >
                  <div className="text-sm">{e.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{e.type}</div>
                </button>
              </li>
            ))}
            {!filtered.length && <li className="text-sm text-slate-500 px-3 py-2">No matches.</li>}
          </ul>
          <button onClick={() => setAdding(false)} className="text-sm text-slate-500">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 rounded-xl border border-dashed border-slate-300 text-slate-600"
        >
          + Add exercise
        </button>
      )}

      <button onClick={deleteSession} className="w-full text-sm text-red-600 py-2">
        Delete session
      </button>
    </div>
  )
}

function SlotEditor({ slot, onChanged }: { slot: Slot; onChanged: () => void }) {
  const [notes, setNotes] = useState(slot.coach_notes ?? '')

  async function saveNotes() {
    if (notes === (slot.coach_notes ?? '')) return
    await supabase.from('exercise_slots').update({ coach_notes: notes || null }).eq('id', slot.id)
    onChanged()
  }

  async function remove() {
    if (!confirm('Remove this exercise?')) return
    await supabase.from('exercise_slots').delete().eq('id', slot.id)
    onChanged()
  }

  async function addSet() {
    const nextIndex = (slot.set_logs.at(-1)?.set_index ?? 0) + 1
    const last = slot.set_logs.at(-1)
    const { error } = await supabase.from('set_logs').insert({
      slot_id: slot.id,
      set_index: nextIndex,
      reps: last?.reps ?? 5,
      weight: last?.weight ?? 0,
      rpe: last?.rpe ?? null,
    })
    if (error) alert(error.message)
    else onChanged()
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{slot.exercise.name}</div>
          <div className="text-xs text-slate-500 capitalize">{slot.exercise.type}</div>
        </div>
        <button onClick={remove} className="text-slate-400 text-sm">×</button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Notes (tempo, cues, etc.)"
        rows={2}
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
      />

      {slot.set_logs.length > 0 && (
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center text-xs text-slate-500">
          <div>Set</div>
          <div>Weight</div>
          <div>Reps</div>
          <div>RPE</div>
          <div />
        </div>
      )}

      {slot.set_logs.map((s) => (
        <CoachSetRow key={s.id} set={s} onChanged={onChanged} />
      ))}

      <button
        onClick={addSet}
        className="w-full text-sm py-2 rounded-lg border border-dashed border-slate-300 text-slate-600"
      >
        + Add set {(slot.set_logs.at(-1)?.set_index ?? 0) + 1}
      </button>
    </div>
  )
}

function CoachSetRow({ set, onChanged }: { set: SetLog; onChanged: () => void }) {
  const [weight, setWeight] = useState<number | ''>(set.weight)
  const [reps, setReps] = useState<number | ''>(set.reps)
  const [rpe, setRpe] = useState<number | ''>(set.rpe ?? '')

  async function save() {
    const payload = {
      weight: weight === '' ? 0 : Number(weight),
      reps: reps === '' ? 0 : Number(reps),
      rpe: rpe === '' ? null : Number(rpe),
    }
    if (payload.weight === set.weight && payload.reps === set.reps && payload.rpe === set.rpe) return
    const { error } = await supabase.from('set_logs').update(payload).eq('id', set.id)
    if (error) alert(error.message)
    else onChanged()
  }

  async function remove() {
    const { error } = await supabase.from('set_logs').delete().eq('id', set.id)
    if (error) alert(error.message)
    else onChanged()
  }

  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center">
      <div className="text-sm font-medium w-6">{set.set_index}</div>
      <input type="number" inputMode="decimal" step={0.5} value={weight}
        onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
        onBlur={save}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center" />
      <input type="number" inputMode="numeric" step={1} value={reps}
        onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))}
        onBlur={save}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center" />
      <input type="number" inputMode="decimal" step={0.5} value={rpe} placeholder="—"
        onChange={(e) => setRpe(e.target.value === '' ? '' : Number(e.target.value))}
        onBlur={save}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center" />
      <button onClick={remove} className="text-slate-400 text-sm px-2">×</button>
    </div>
  )
}
