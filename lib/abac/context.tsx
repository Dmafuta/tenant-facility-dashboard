'use client'
import { createContext, useContext } from 'react'
import type { Subject, Action, ResourceType } from './types'
import { evaluate } from './policy'

interface AbacCtx { subject: Subject; can: (action: Action, resource: { type: ResourceType; id?: string | number; ownerId?: string }) => boolean }

const AbacContext = createContext<AbacCtx | null>(null)

export function AbacProvider({ subject, children }: { subject: Subject; children: React.ReactNode }) {
  const can = (action: Action, resource: { type: ResourceType; id?: string | number; ownerId?: string }) =>
    evaluate(subject, action, resource)
  return <AbacContext.Provider value={{ subject, can }}>{children}</AbacContext.Provider>
}

export function useAbac() {
  const ctx = useContext(AbacContext)
  if (!ctx) throw new Error('useAbac must be used within AbacProvider')
  return ctx
}
