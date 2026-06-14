'use client'
import { createContext, useContext, useState, useEffect } from 'react'

interface SidebarCtx {
  collapsed: boolean      // desktop icon-only mode
  mobileOpen: boolean     // mobile overlay open
  toggleCollapsed: () => void
  toggleMobile: () => void
  closeMobile: () => void
}

const Ctx = createContext<SidebarCtx | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // restore desktop collapse preference
  useEffect(() => {
    try {
      if (localStorage.getItem('sidebar-collapsed') === 'true') setCollapsed(true)
    } catch {}
  }, [])

  // close mobile drawer on route change / resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  return (
    <Ctx.Provider value={{
      collapsed,
      mobileOpen,
      toggleCollapsed,
      toggleMobile: () => setMobileOpen(o => !o),
      closeMobile:  () => setMobileOpen(false),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
