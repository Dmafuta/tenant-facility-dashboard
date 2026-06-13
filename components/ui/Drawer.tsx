'use client'
import { cn } from '@/lib/cn'
import { useEffect } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: string
}
export function Drawer({ open, onClose, title, children, width = 'w-[480px]' }: DrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      <div className={cn('fixed inset-0 z-40 bg-black/40 transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')} onClick={onClose} />
      <aside className={cn('fixed top-0 right-0 h-full z-50 bg-white dark:bg-dark-card shadow-dropdown flex flex-col transition-transform duration-300', width, open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  )
}
