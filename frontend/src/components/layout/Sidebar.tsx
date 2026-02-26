import { NavLink, useLocation } from 'react-router-dom'
import {
  Search,
  Users,
  Upload,
  Briefcase,
  ListChecks,
  LayoutDashboard,
  Settings,
  Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Candidates', href: '/candidates', icon: Users },
  { name: 'Upload', href: '/upload', icon: Upload },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Shortlists', href: '/shortlists', icon: ListChecks },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white">ResumeAI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href)
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-active text-white'
                  : 'text-indigo-200 hover:bg-sidebar-hover hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-indigo-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-medium text-white">
            AI
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Powered by AI</p>
            <p className="text-xs text-indigo-300">Smart Search Engine</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
