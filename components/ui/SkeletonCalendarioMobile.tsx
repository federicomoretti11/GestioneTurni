import { Skeleton } from './Skeleton'

export function SkeletonCalendarioMobile({ giorni = 7, righe = 4 }: { giorni?: number; righe?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Day pills */}
      <div className="flex gap-1.5 overflow-hidden pb-2 -mx-4 px-4">
        {Array.from({ length: giorni }).map((_, i) => (
          <Skeleton key={i} className="flex-shrink-0 w-[52px] h-[60px]" rounded="lg" />
        ))}
      </div>

      {/* Day header */}
      <div className="px-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-24 mt-1.5" />
      </div>

      {/* Row cards */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: righe }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-3 flex items-center gap-3"
          >
            <Skeleton className="w-1 h-9" rounded="full" />
            <Skeleton className="w-[34px] h-[34px]" rounded="full" />
            <div className="flex-1">
              <Skeleton className="h-3 w-32" />
              <div className="flex items-center gap-1.5 mt-2">
                <Skeleton className="h-4 w-20" rounded="full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
