export function SkeletonCalendario({ righe = 5, colonne = 7 }: { righe?: number; colonne?: number }) {
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="border-collapse text-sm w-full">
        <thead>
          <tr>
            <th className="border border-gray-100 bg-gray-100 px-3 py-2 min-w-[140px]">
              <div className="h-3 bg-gray-200 rounded w-20" />
            </th>
            {Array.from({ length: colonne }).map((_, i) => (
              <th key={i} className="border border-gray-100 bg-gray-100 px-2 py-2 min-w-[80px]">
                <div className="h-3 bg-gray-200 rounded w-12 mx-auto" />
              </th>
            ))}
            <th className="border border-gray-100 bg-blue-50 px-3 py-2 min-w-[70px]">
              <div className="h-3 bg-blue-100 rounded w-10 mx-auto" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: righe }).map((_, r) => (
            <tr key={r}>
              <td className="border border-gray-100 px-3 py-2">
                <div className="h-3 bg-gray-200 rounded w-24" />
              </td>
              {Array.from({ length: colonne }).map((_, c) => (
                <td key={c} className="border border-gray-100 p-1 h-14">
                  {Math.random() > 0.6 && (
                    <div className="h-8 bg-gray-200 rounded mx-1" />
                  )}
                </td>
              ))}
              <td className="border border-gray-100 bg-blue-50 px-3 py-2">
                <div className="h-3 bg-blue-100 rounded w-8 mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
