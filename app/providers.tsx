'use client'
import { AbacProvider } from '@/lib/abac/context'
import type { Subject } from '@/lib/abac/types'

export function Providers({ subject, children }: { subject: Subject; children: React.ReactNode }) {
  return <AbacProvider subject={subject}>{children}</AbacProvider>
}
