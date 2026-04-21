interface ModalProps {
  open: boolean
  onClose: () => void
  onCloseRequest?: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, onCloseRequest, title, children }: ModalProps) {
  if (!open) return null
  const handleClose = onCloseRequest ?? onClose
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}
