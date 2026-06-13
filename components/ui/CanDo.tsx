'use client'
import { useAbac } from '@/lib/abac/context'
import type { Action, ResourceType } from '@/lib/abac/types'

interface CanDoProps {
  action: Action
  resource: { type: ResourceType; id?: string | number; ownerId?: string }
  children: React.ReactNode
  fallback?: React.ReactNode
}
export function CanDo({ action, resource, children, fallback = null }: CanDoProps) {
  const { can } = useAbac()
  return <>{can(action, resource) ? children : fallback}</>
}
