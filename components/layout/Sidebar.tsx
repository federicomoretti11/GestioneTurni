'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem { label: string; href: string; icon: string }

interface SidebarProps { items: NavItem[]; title: string }

export function Sidebar({ items, title }: SidebarProps) {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-56 bg-gray-900 text-white flex-shrink-0">
      <div className="h-14 flex items-center px-4 font-bold text-lg border-b border-gray-700">
        {title}
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
