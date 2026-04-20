import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Exercise {
  id: string
  name: string
  type: string
  notes: string | null
}

export default function CoachExercises() {
  const [items, setItems] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('exercises').select('*').order('name')
    setItems((data ?? []) as Exercise[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const types = useMemo(() => ['all', ...new Set(items.map((i) => i.type))], [items])
  const filtered = items.filter((i) => {
    const matchesType = typeFilter === 'all' || i.type === typeFilter
    const matchesQuery = (i.name + ' ' + i.type).toLowerCase().includes(query.toLowerCase())
    return matchesType && matchesQuery
  })

  async function add() {
    const name = prompt('Exercise name?')
    if (!name) return
    const type = prompt('Type (e.g. compound, accessory, cardio)') || 'accessory'
    const { error } = await supabase.from('exercises').insert({ name, type })
    if (error) alert(error.message)
    else load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this exercise? It must not be in use.')) return
    const { error } = await supabase.from('exercises').delete().eq('id', id)
    if (error) alert(error.message)
    else load()
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2"
        />
        <button onClick={add} className="bg-slate-900 text-white rounded-lg px-3 py-2 text-sm">+ New</button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
              typeFilter === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <li key={e.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-start justify-between">
              <div>
                <div className="font-medium">{e.name}</div>
                <div className="text-xs text-slate-500 capitalize">{e.type}</div>
              </div>
              <button onClick={() => remove(e.id)} className="text-slate-400 text-sm">×</button>
            </li>
          ))}
          {!filtered.length && (
            <li className="text-sm text-slate-500 bg-white border border-slate-200 rounded-xl p-4">
              No exercises.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
