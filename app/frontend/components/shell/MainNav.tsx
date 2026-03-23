import { Link, usePage } from '@inertiajs/react'
import { ListTodo, Sparkles, Activity, Users, Settings } from 'lucide-react'

const navItems = [
  { label: 'Tasks', icon: ListTodo, href: '/' },
  { label: 'Skills', icon: Sparkles, href: '/skills' },
  { label: 'Activity', icon: Activity, href: '/activity' },
  { label: 'Agents', icon: Users, href: '/agents' },
  { label: 'Settings', icon: Settings, href: '/settings' },
]

export function MainNav() {
  const { url } = usePage()

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ label, icon: Icon, href }) => {
        const isActive = href === '/' ? url === '/' : url.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
            ].join(' ')}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
