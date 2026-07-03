'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context'
import AiQueryPanel from '@/components/AiQueryPanel'

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  const [aiOpen, setAiOpen] = useState(false)

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

      {/* Floating Ask AI button */}
      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-20 right-5 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-600 text-white text-sm font-semibold shadow-lg hover:bg-violet-700 transition-colors lg:bottom-6"
        aria-label="Ask AI"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        Ask AI
      </button>

      <AiQueryPanel open={aiOpen} onClose={() => setAiOpen(false)} />
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
