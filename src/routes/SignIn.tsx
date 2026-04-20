import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        {sent ? (
          <p className="text-sm text-slate-600">Check your email for a login link.</p>
        ) : (
          <>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="w-full bg-slate-900 text-white rounded-lg py-2">Send magic link</button>
          </>
        )}
      </form>
    </div>
  )
}
