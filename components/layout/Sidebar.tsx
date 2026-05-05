'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem { label: string; href: string; icon: string; badge?: number; section?: string }

interface SidebarProps { items: NavItem[]; title: string; ruolo?: string; logoSrc?: string }

export function Sidebar({ items, title, ruolo, logoSrc }: SidebarProps) {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-white flex-shrink-0">
      <div className="px-4 py-4 border-b border-white/5">
        {logoSrc ? (
          <div className="flex items-center gap-2.5">
            <img src={logoSrc} alt={title} className="h-7 w-7 shrink-0" />
            <div>
              <div className="text-[13px] font-bold tracking-tight text-white">{title}</div>
              {ruolo && <div className="text-[10px] text-slate-500 mt-0.5 capitalize">{ruolo}</div>}
            </div>
          </div>
        ) : (
          <>
            <div className="text-[13px] font-bold tracking-tight text-white">{title}</div>
            {ruolo && <div className="text-[10px] text-slate-500 mt-0.5 capitalize">{ruolo}</div>}
          </>
        )}
      </div>
      <nav className="flex-1 p-2">
        {items.map((item, i) => {
          const showSection = item.section && item.section !== items[i - 1]?.section
          const isActive = pathname === item.href
          return (
            <div key={`${item.section ?? ''}-${item.href}`}>
              {showSection && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {item.section}
                </div>
              )}
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-[15px] leading-none">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
