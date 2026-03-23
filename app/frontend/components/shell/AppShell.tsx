import { MainNav } from './MainNav'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <div className="flex h-14 items-center border-b border-neutral-200 px-4">
          <span className="text-sm font-semibold tracking-tight text-neutral-900">
            OpenClaw
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <MainNav />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
