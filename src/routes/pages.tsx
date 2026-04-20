function Placeholder({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      <p className="text-sm text-slate-500">Coming soon.</p>
    </div>
  )
}

export const CoachDashboard = () => <Placeholder title="Dashboard" />
export const CoachStudents = () => <Placeholder title="Students" />
export const CoachStudentView = () => <Placeholder title="Student" />
export const CoachSessionEditor = () => <Placeholder title="Session editor" />
export const CoachReviews = () => <Placeholder title="Review sessions" />
export const CoachExercises = () => <Placeholder title="Exercise library" />

export const StudentStats = () => <Placeholder title="Stats" />
export const StudentGoals = () => <Placeholder title="Goals" />
