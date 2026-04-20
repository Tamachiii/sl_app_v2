import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/session'

const tabs = [
  { to: '/student', label: 'Home', end: true },
  { to: '/student/sessions', label: 'Sessions' },
  { to: '/student/stats', label: 'Stats' },
  { to: '/student/goals', label: 'Goals' },
]

export default function StudentLayout() {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-16">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">{profile?.full_name}</div>
        <button onClick={signOut} className="text-sm text-slate-500">Sign out</button>
      </header>
      <main className="flex-1 p-4"><Outlet /></main>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex-1 text-center py-3 text-xs ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-500'}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
