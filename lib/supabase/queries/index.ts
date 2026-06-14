import { createClient } from '@/lib/supabase/server'
import type { Person, Unit } from '@/lib/types'
import { PEOPLE as MOCK_PEOPLE } from '@/lib/mock-data/people'
import { UNITS as MOCK_UNITS } from '@/lib/mock-data/units'

// ── People ──────────────────────────────────────────────────────────────

export async function getPeople(): Promise<Person[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('last_name')

    if (error || !data || data.length === 0) {
      // Fall back to mock data if table is empty or inaccessible
      return MOCK_PEOPLE
    }

    return data as Person[]
  } catch {
    return MOCK_PEOPLE
  }
}

export async function insertPerson(person: Omit<Person, 'id'>): Promise<Person | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('people')
      .insert(person)
      .select()
      .single()

    if (error) throw error
    return data as Person
  } catch {
    return null
  }
}

// ── Units ────────────────────────────────────────────────────────────────

export async function getUnits(): Promise<Unit[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('block')
      .order('number')

    if (error || !data || data.length === 0) {
      return MOCK_UNITS
    }

    return data as Unit[]
  } catch {
    return MOCK_UNITS
  }
}

export async function insertUnit(unit: Omit<Unit, 'id'>): Promise<Unit | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single()

    if (error) throw error
    return data as Unit
  } catch {
    return null
  }
}
