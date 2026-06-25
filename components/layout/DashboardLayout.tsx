'use client'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context'

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--bg)]"
      // CSS variable drives the desktop margin via globals.css
      style={{ '--sidebar-offset': collapsed ? '64px' : '240px' } as React.CSSProperties}
    >
      <Sidebar />
      {/* .layout-content picks up --sidebar-offset only at lg+ via globals.css */}
      <div className="layout-content flex-1 flex flex-col overflow-hidden transition-all duration-300">
        {children}
        <BottomBar />
      </div>
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  )
}
