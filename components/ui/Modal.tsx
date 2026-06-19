'use client'
import { cn } from '@/lib/cn'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Set true when the child already manages its own padding and scrolling */
  noPadding?: boolean
}
const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, size = 'md', className, noPadding }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className={cn('relative w-full bg-white dark:bg-dark-card rounded-xl shadow-dropdown animate-fade-in flex flex-col max-h-[90vh]', sizes[size], className)}>
          {title && (
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-surface-border dark:border-dark-border">
              <h2 className="text-base font-semibold text-text">{title}</h2>
              <button onClick={onClose} className="text-text-muted hover:text-text transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          )}
          <div className={cn('overflow-y-auto flex-1', !noPadding && 'px-6 py-5')}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
