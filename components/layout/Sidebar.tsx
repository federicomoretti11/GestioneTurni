'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem { label: string; href: string; icon: string }

interface SidebarProps { items: NavItem[]; title: string; ruolo?: string }

export function Sidebar({ items, title, ruolo }: SidebarProps) {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 bg-slate-900 text-white flex-shrink-0">
      <div className="px-4 py-4 border-b border-white/5">
        <div className="text-[13px] font-bold tracking-tight text-white">{title}</div>
        {ruolo && <div className="text-[10px] text-slate-500 mt-0.5 capitalize">{ruolo}</div>}
      </div>
      <nav className="flex-1 p-2">
        {items.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors mb-0.5 ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-[15px] leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
