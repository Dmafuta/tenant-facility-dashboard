'use client'
import { SidebarV2 } from './SidebarV2'
import { TopBarV2 } from './TopBarV2'
import { StatusBar } from './AppFooter'
import AiQueryPanel from '@/components/AiQueryPanel'
import { useState } from 'react'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <SidebarV2 />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBarV2 />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        <StatusBar />
      </div>

      {/* AI assistant */}
      <button
        onClick={() => setAiOpen(true)}
        aria-label="Ask AI"
        className="fixed bottom-10 right-5 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold shadow-lg hover:bg-indigo-700 transition-colors"
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
