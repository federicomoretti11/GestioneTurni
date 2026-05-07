'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem { label: string; href: string; icon: string; badge?: number; section?: string; altHrefs?: string[] }

interface SidebarProps { items: NavItem[]; title: string; ruolo?: string; logoSrc?: string; tenantName?: string }

export function Sidebar({ items, title, ruolo, tenantName }: SidebarProps) {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-white flex-shrink-0">
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <img src="/logo-extended-white.svg" alt="Opero Hub" className="h-11 w-auto" />
      </div>
      <nav className="flex-1 p-2">
        {items.map((item, i) => {
          const showSection = item.section && item.section !== items[i - 1]?.section
          const isActive = pathname === item.href || (item.altHrefs?.includes(pathname) ?? false)
          return (
            <div key={`${item.section ?? ''}-${item.href}`}>
              {showSection && (
                <div className={`px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${i > 0 ? 'mt-3 pt-3 border-t border-white/10' : 'pt-2'}`}>
                  {item.section}
                </div>
              )}
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-white font-medium hover:bg-white/10'
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
