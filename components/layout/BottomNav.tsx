'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItem { label: string; href: string; icon: string }

const MAX_VISIBILI = 4

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const [altroAperto, setAltroAperto] = useState(false)

  const visibili = items.slice(0, MAX_VISIBILI)
  const nascosti = items.slice(MAX_VISIBILI)
  const haAltro = nascosti.length > 0
  const altroAttivo = nascosti.some(i => pathname === i.href)

  return (
    <>
      {altroAperto && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setAltroAperto(false)}
        />
      )}
      {altroAperto && (
        <div className="md:hidden fixed bottom-16 right-2 z-50 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {nascosti.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAltroAperto(false)}
              className={`flex items-center gap-3 px-4 py-3 text-sm ${
                pathname === item.href ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {visibili.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 text-[10px] gap-1 ${
                isActive ? 'text-blue-600 font-semibold' : 'text-gray-500'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
        {haAltro && (
          <button
            onClick={() => setAltroAperto(v => !v)}
            className={`flex-1 flex flex-col items-center py-3 text-[10px] gap-1 ${
              altroAttivo || altroAperto ? 'text-blue-600 font-semibold' : 'text-gray-500'
            }`}
          >
            <span className="text-lg leading-none">⋯</span>
            Altro
          </button>
        )}
      </nav>
    </>
  )
}
