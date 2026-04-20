function Placeholder({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      <p className="text-sm text-slate-500">Coming soon.</p>
    </div>
  )
}

export const StudentStats = () => <Placeholder title="Stats" />
export const StudentGoals = () => <Placeholder title="Goals" />
