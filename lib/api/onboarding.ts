import { apiFetch } from './fetch'

export interface OnboardingItemData {
  id: string
  task: string
  category: string
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  sort_order: number
}

export interface OnboardingChecklistData {
  id: string
  person_id: string
  person_name: string
  status: string
  progress: number
  items: OnboardingItemData[]
  created_at: string | null
}

export function listOnboarding(): Promise<OnboardingChecklistData[]> {
  return apiFetch('/staff/onboarding')
}

export function getOnboarding(personId: string): Promise<OnboardingChecklistData> {
  return apiFetch(`/staff/onboarding/${personId}`)
}

export function createOnboarding(personId: string): Promise<OnboardingChecklistData> {
  return apiFetch('/staff/onboarding', { method: 'POST', body: JSON.stringify({ person_id: personId }) })
}

export function toggleOnboardingItem(
  itemId: string,
  payload: { completed: boolean; completed_by?: string }
): Promise<OnboardingChecklistData> {
  return apiFetch(`/staff/onboarding/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteOnboarding(personId: string): Promise<void> {
  return apiFetch(`/staff/onboarding/${personId}`, { method: 'DELETE' })
}
