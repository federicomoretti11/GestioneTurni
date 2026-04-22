interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  size?: 'sm' | 'md'
}

export function EmptyState({ icon = '📭', title, description, action, size = 'md' }: EmptyStateProps) {
  const isSm = size === 'sm'
  return (
    <div className={`flex flex-col items-center justify-center text-center ${isSm ? 'py-6 px-4' : 'py-10 px-6'}`}>
      <div
        className={`flex items-center justify-center rounded-full bg-gray-100 ${
          isSm ? 'w-10 h-10 text-lg' : 'w-14 h-14 text-2xl'
        } mb-3`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className={`font-semibold text-gray-700 ${isSm ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && (
        <p className={`text-gray-500 mt-1 max-w-xs ${isSm ? 'text-xs' : 'text-sm'}`}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
