import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/session'
import { useSessionDetail, type SetLogRow, type SlotRow } from './useSessionDetail'

export default function StudentSessionLog() {
  const { sessionId } = useParams()
  const { profile } = useAuth()
  const nav = useNavigate()
  const { data, loading, error, reload } = useSessionDetail(sessionId, profile?.id)
  const [confirming, setConfirming] = useState(false)

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return null

  async function confirm() {
    setConfirming(true)
    const { error } = await supabase
      .from('sessions')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', data!.id)
    setConfirming(false)
    if (error) alert(error.message)
    else nav('/student/sessions')
  }

  return (
    <div className="space-y-4">
      <div>
        <button onClick={() => nav(-1)} className="text-sm text-slate-500 mb-2">← Back</button>
        <h1 className="text-xl font-semibold">{data.name}</h1>
        <p className="text-xs text-slate-500">Day {data.day_index}</p>
      </div>

      {data.slots.map((slot) => (
        <SlotCard key={slot.id} slot={slot} onChanged={reload} />
      ))}

      {data.confirmed_at ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 text-center">
          Session confirmed {new Date(data.confirmed_at).toLocaleDateString()}
        </div>
      ) : (
        <button
          onClick={confirm}
          disabled={confirming}
          className="w-full bg-slate-900 text-white rounded-xl py-3 font-medium disabled:opacity-50"
        >
          {confirming ? 'Confirming…' : 'Confirm session'}
        </button>
      )}
    </div>
  )
}

function SlotCard({ slot, onChanged }: { slot: SlotRow; onChanged: () => void }) {
  const nextIndex = (slot.set_logs.at(-1)?.set_index ?? 0) + 1

  async function addSet() {
    const hint = slot.last_logs.find((l) => l.set_index === nextIndex)
    const { error } = await supabase.from('set_logs').insert({
      slot_id: slot.id,
      set_index: nextIndex,
      reps: hint?.reps ?? 0,
      weight: hint?.weight ?? 0,
      rpe: hint?.rpe ?? null,
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
      </div>

      {slot.coach_notes && (
        <p className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-800">
          {slot.coach_notes}
        </p>
      )}

      <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center text-xs text-slate-500">
        <div>Set</div>
        <div>Weight</div>
        <div>Reps</div>
        <div>RPE</div>
        <div />
      </div>

      {slot.set_logs.map((log) => (
        <SetRow key={log.id} log={log} hint={slot.last_logs.find((l) => l.set_index === log.set_index)} onChanged={onChanged} />
      ))}

      <button
        onClick={addSet}
        className="w-full text-sm py-2 rounded-lg border border-dashed border-slate-300 text-slate-600 active:bg-slate-50"
      >
        + Add set {nextIndex}
      </button>
    </div>
  )
}

function SetRow({
  log,
  hint,
  onChanged,
}: {
  log: SetLogRow
  hint?: SetLogRow
  onChanged: () => void
}) {
  const [weight, setWeight] = useState(log.weight)
  const [reps, setReps] = useState(log.reps)
  const [rpe, setRpe] = useState<number | null>(log.rpe)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (weight === log.weight && reps === log.reps && rpe === log.rpe) return
    setSaving(true)
    const { error } = await supabase
      .from('set_logs')
      .update({ weight, reps, rpe })
      .eq('id', log.id)
    setSaving(false)
    if (error) alert(error.message)
    else onChanged()
  }

  async function remove() {
    const { error } = await supabase.from('set_logs').delete().eq('id', log.id)
    if (error) alert(error.message)
    else onChanged()
  }

  const hintLabel = hint ? `${hint.weight}×${hint.reps}${hint.rpe ? ` @${hint.rpe}` : ''}` : null

  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center">
      <div className="text-sm font-medium w-6">{log.set_index}</div>
      <NumField value={weight} onChange={setWeight} onBlur={save} step={0.5} placeholder={hint ? String(hint.weight) : 'kg'} />
      <NumField value={reps} onChange={setReps} onBlur={save} step={1} placeholder={hint ? String(hint.reps) : 'reps'} />
      <NumField value={rpe ?? ''} onChange={(v) => setRpe(v === '' ? null : Number(v))} onBlur={save} step={0.5} placeholder="RPE" />
      <button onClick={remove} className="text-slate-400 text-sm px-2" aria-label="Remove set">×</button>
      {saving && <div className="col-span-5 text-xs text-slate-400">Saving…</div>}
      {hintLabel && (
        <div className="col-span-5 text-xs text-slate-400 -mt-1">Last: {hintLabel}</div>
      )}
    </div>
  )
}

function NumField({
  value,
  onChange,
  onBlur,
  step,
  placeholder,
}: {
  value: number | string
  onChange: (v: any) => void
  onBlur: () => void
  step: number
  placeholder: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      onBlur={onBlur}
      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-center"
    />
  )
}
