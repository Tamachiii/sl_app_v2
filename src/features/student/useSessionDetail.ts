import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface SetLogRow {
  id: string
  slot_id: string
  set_index: number
  reps: number
  weight: number
  rpe: number | null
}

export interface SlotRow {
  id: string
  order_index: number
  coach_notes: string | null
  exercise: { id: string; name: string; type: string }
  set_logs: SetLogRow[]
  last_logs: SetLogRow[] // most recent logs for the same exercise in any prior session
}

export interface SessionDetail {
  id: string
  name: string
  day_index: number
  student_note: string | null
  confirmed_at: string | null
  slots: SlotRow[]
}

export function useSessionDetail(sessionId: string | undefined, studentId: string | undefined) {
  const [data, setData] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId || !studentId) return
    setLoading(true)
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select(`
        id, name, day_index, student_note, confirmed_at,
        exercise_slots (
          id, order_index, coach_notes,
          exercise:exercises ( id, name, type ),
          set_logs ( id, slot_id, set_index, reps, weight, rpe )
        )
      `)
      .eq('id', sessionId)
      .order('order_index', { referencedTable: 'exercise_slots', ascending: true })
      .order('set_index', { referencedTable: 'exercise_slots.set_logs', ascending: true })
      .maybeSingle()

    if (sErr || !session) {
      setError(sErr?.message ?? 'Session not found')
      setLoading(false)
      return
    }

    // Fetch last logs per exercise from this student's prior sessions.
    const slotsRaw = (session as any).exercise_slots ?? []
    const exerciseIds = slotsRaw.map((s: any) => s.exercise?.id).filter(Boolean) as string[]
    const lastByExercise: Record<string, SetLogRow[]> = {}
    if (exerciseIds.length) {
      const { data: prior } = await supabase
        .from('set_logs')
        .select(`
          id, slot_id, set_index, reps, weight, rpe, logged_at,
          exercise_slots!inner (
            exercise_id,
            sessions!inner (
              id,
              weeks!inner ( programs!inner ( student_id ) )
            )
          )
        `)
        .in('exercise_slots.exercise_id', exerciseIds)
        .neq('exercise_slots.session_id', sessionId)
        .eq('exercise_slots.sessions.weeks.programs.student_id', studentId)
        .order('logged_at', { ascending: false })
        .limit(200)

      for (const row of prior ?? []) {
        const exId = (row as any).exercise_slots?.exercise_id as string | undefined
        if (!exId) continue
        if (!lastByExercise[exId]) lastByExercise[exId] = []
        // Keep only the most recent session's set per index
        const existingSlotId = lastByExercise[exId][0]?.slot_id
        if (!existingSlotId || existingSlotId === row.slot_id) {
          lastByExercise[exId].push({
            id: row.id,
            slot_id: row.slot_id,
            set_index: row.set_index,
            reps: row.reps,
            weight: row.weight,
            rpe: row.rpe,
          })
        }
      }
    }

    const slots: SlotRow[] = slotsRaw.map((s: any) => ({
      id: s.id,
      order_index: s.order_index,
      coach_notes: s.coach_notes,
      exercise: s.exercise,
      set_logs: (s.set_logs ?? []) as SetLogRow[],
      last_logs: (lastByExercise[s.exercise?.id] ?? []).sort((a, b) => a.set_index - b.set_index),
    }))

    setData({
      id: session.id,
      name: session.name,
      day_index: session.day_index,
      student_note: session.student_note,
      confirmed_at: session.confirmed_at,
      slots,
    })
    setLoading(false)
  }, [sessionId, studentId])

  useEffect(() => {
    void load()
  }, [load])

  return { data, loading, error, reload: load, setData }
}
