import { createClient } from '@/lib/supabase/server'
import type { Person, Unit, UnitUseType, UnitStatus } from '@/lib/types'
import { PEOPLE as MOCK_PEOPLE } from '@/lib/mock-data/people'
import { UNITS as MOCK_UNITS } from '@/lib/mock-data/units'

// -- People ------------------------------------------------------------------

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

// -- Units -------------------------------------------------------------------

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

    // Transform DB rows into the Unit display type.
    // The units table has monthly_rent; the Unit type expects monthly_rate.
    // use_type is added in migration 003; owners/occupant are not on this row.
    return data.map((row) => ({
      id:               row.id,
      block:            row.block ?? '',
      floor:            row.floor ?? 0,
      number:           row.number ?? '',
      size_sqm:         Number(row.size_sqm ?? 0),
      bedrooms:         row.bedrooms ?? 0,
      bathrooms:        Number(row.bathrooms ?? 0),
      use_type:         (row.use_type ?? 'residential') as UnitUseType,
      status:           (row.status ?? 'vacant') as UnitStatus,
      monthly_rate:     Number(row.monthly_rent ?? 0),
      owners:           [] as Unit['owners'],
      current_occupant: undefined,
      lease_end:        undefined,
    })) as Unit[]
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
