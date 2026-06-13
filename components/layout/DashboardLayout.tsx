import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar />
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: 'var(--sidebar-w)' }}
      >
        {children}
      </div>
    </div>
  )
}
