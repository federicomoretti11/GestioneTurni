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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white shadow-xl w-full md:max-w-md md:mx-4 p-5 pb-7 md:p-6 rounded-t-2xl md:rounded-xl max-h-[92vh] overflow-y-auto animate-slide-up md:animate-none">
        <div className="md:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}
