import { AppShell } from './AppShell'

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <AppShell>
      {children}
    </AppShell>
  )
}
