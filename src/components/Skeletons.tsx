export function ExpenseCardSkeleton() {
  return (
    <div className="bg-slate-800/20 border border-slate-800/50 rounded-2xl p-4 flex items-center justify-between gap-3 animate-pulse">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Category Icon */}
        <div className="w-10 h-10 rounded-full bg-slate-700/50 flex-shrink-0"></div>
        
        {/* Title and details */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
          <div className="h-3 bg-slate-700/30 rounded w-1/2"></div>
        </div>
      </div>

      {/* Amount and split info */}
      <div className="text-right flex-shrink-0 space-y-2">
        <div className="h-4 bg-slate-700/50 rounded w-16 ml-auto"></div>
        <div className="h-3 bg-slate-700/30 rounded w-20 ml-auto"></div>
      </div>
    </div>
  )
}

export function GroupCardSkeleton() {
  return (
    <div className="w-full text-left rounded-2xl p-4 border bg-slate-800/20 border-slate-800/50 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-700/50 rounded w-2/3"></div>
          <div className="h-3 bg-slate-700/30 rounded w-1/3"></div>
        </div>
        <div className="w-16 flex flex-col items-end space-y-2">
          <div className="h-4 bg-slate-700/50 rounded w-full"></div>
          <div className="h-2 bg-slate-700/30 rounded w-3/4"></div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-7 h-7 rounded-full bg-slate-700/50 border-2 border-[#0f172a] -ml-2 first:ml-0"></div>
        ))}
      </div>
    </div>
  )
}
