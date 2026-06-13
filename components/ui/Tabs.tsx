'use client'
import { cn } from '@/lib/cn'
import { createContext, useContext, useState } from 'react'

const TabsCtx = createContext<{ active: string; set: (v: string) => void } | null>(null)

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [active, set] = useState(defaultValue)
  return <TabsCtx.Provider value={{ active, set }}><div className={className}>{children}</div></TabsCtx.Provider>
}
export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex gap-1 border-b border-surface-border dark:border-dark-border', className)}>{children}</div>
}
export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = useContext(TabsCtx)!
  const active = ctx.active === value
  return (
    <button
      onClick={() => ctx.set(value)}
      className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        active ? 'border-primary-600 text-primary-600' : 'border-transparent text-text-muted hover:text-text'
      )}
    >{children}</button>
  )
}
export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = useContext(TabsCtx)!
  if (ctx.active !== value) return null
  return <div className={cn('animate-fade-in', className)}>{children}</div>
}
