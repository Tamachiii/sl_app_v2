import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { AuthContext } from './session'
import type { Profile } from '../types/domain'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadProfile(userId: string) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (!cancelled) setProfile((data as Profile) ?? null)
    }

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      if (uid) loadProfile(uid).finally(() => !cancelled && setLoading(false))
      else if (!cancelled) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id
      if (uid) loadProfile(uid)
      else setProfile(null)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ profile, loading, signOut }}>{children}</AuthContext.Provider>
}
