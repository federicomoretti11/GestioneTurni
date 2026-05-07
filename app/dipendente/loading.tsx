export default function DipendenteLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 bg-slate-200 rounded-lg w-48" />
      <div className="bg-white rounded-xl border border-slate-900/20 p-4 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-4 bg-slate-200 rounded w-2/5" />
      </div>
      <div className="bg-white rounded-xl border border-slate-900/20 p-4 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="h-4 bg-slate-200 rounded w-3/5" />
        <div className="h-4 bg-slate-200 rounded w-2/5" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>
    </div>
  )
}
