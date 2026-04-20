import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/session'

const tabs = [
  { to: '/coach', label: 'Dashboard', end: true },
  { to: '/coach/students', label: 'Students' },
  { to: '/coach/reviews', label: 'Reviews' },
  { to: '/coach/exercises', label: 'Exercises' },
]

export default function CoachLayout() {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">Coach · {profile?.full_name}</div>
        <button onClick={signOut} className="text-sm text-slate-500">Sign out</button>
      </header>
      <nav className="bg-white border-b border-slate-200 px-4 flex gap-4 overflow-x-auto">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `py-3 text-sm whitespace-nowrap ${isActive ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500'}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 p-4"><Outlet /></main>
    </div>
  )
}
