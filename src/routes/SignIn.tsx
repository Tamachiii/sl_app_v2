import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setInfo(null)
    setBusy(true)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setErr(error.message)
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) setErr(error.message)
      else if (!data.session) setInfo('Check your email to confirm your account, then sign in.')
    }

    setBusy(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>

        {mode === 'signup' && (
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        )}

        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
        />

        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
        />

        {err && <p className="text-sm text-red-600">{err}</p>}
        {info && <p className="text-sm text-emerald-700">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-slate-900 text-white rounded-lg py-2 disabled:opacity-50"
        >
          {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setErr(null)
            setInfo(null)
          }}
          className="w-full text-sm text-slate-500"
        >
          {mode === 'signin' ? "No account? Create one" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
