import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './lib/AuthProvider'
import { useAuth } from './lib/session'
import SignIn from './routes/SignIn'
import CoachLayout from './routes/CoachLayout'
import StudentLayout from './routes/StudentLayout'
import {
  CoachDashboard,
  CoachStudents,
  CoachStudentView,
  CoachSessionEditor,
  CoachReviews,
  CoachExercises,
  StudentStats,
  StudentGoals,
} from './routes/pages'
import StudentHome from './features/student/StudentHome'
import StudentSessions from './features/student/StudentSessions'
import StudentSessionLog from './features/student/StudentSessionLog'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function Gate() {
  const { profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Loading…</div>
  if (!profile) return <SignIn />
  return <Navigate to={profile.role === 'coach' ? '/coach' : '/student'} replace />
}

function RoleRoute({ role, children }: { role: 'coach' | 'student'; children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/" replace />
  if (profile.role !== role) return <Navigate to={profile.role === 'coach' ? '/coach' : '/student'} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<Gate />} />

          <Route path="/coach" element={<RoleRoute role="coach"><CoachLayout /></RoleRoute>}>
            <Route index element={<CoachDashboard />} />
            <Route path="students" element={<CoachStudents />} />
            <Route path="students/:studentId" element={<CoachStudentView />} />
            <Route path="sessions/:sessionId/edit" element={<CoachSessionEditor />} />
            <Route path="reviews" element={<CoachReviews />} />
            <Route path="exercises" element={<CoachExercises />} />
          </Route>

          <Route path="/student" element={<RoleRoute role="student"><StudentLayout /></RoleRoute>}>
            <Route index element={<StudentHome />} />
            <Route path="sessions" element={<StudentSessions />} />
            <Route path="sessions/:sessionId" element={<StudentSessionLog />} />
            <Route path="stats" element={<StudentStats />} />
            <Route path="goals" element={<StudentGoals />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
